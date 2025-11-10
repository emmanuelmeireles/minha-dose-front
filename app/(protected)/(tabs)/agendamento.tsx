// Tela de Agendamento integrada com backend real — agendamentos.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import api from '../../../api/api';
import SuccessModal from '../../../components/SuccessModal';
import { globalStyles } from '../../../global';

type Ubs = {
  id: string | number;
  ubsName?: string;
  name?: string;
  address?: {
    street?: string;
    neighborhood?: string;
    city?: string;
    district?: string;
  };
};

type Vaccin = {
  id: string | number;
  name: string;
};

type Slot = {
  date: string;
  time: string;
};

const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const pad = (value: number) => value.toString().padStart(2, '0');
const formatISODate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const buildCalendarMatrix = (referenceDate: Date) => {
  const matrix: Date[][] = [];
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const offset = firstDayOfMonth.getDay(); // 0 (Domingo) - 6 (Sábado)
  let currentDay = 1 - offset;

  // Gera sempre 6 linhas para manter layout estável
  for (let week = 0; week < 6; week += 1) {
    const weekRow: Date[] = [];
    for (let day = 0; day < 7; day += 1) {
      weekRow.push(new Date(year, month, currentDay));
      currentDay += 1;
    }
    matrix.push(weekRow);
  }

  return matrix;
};

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const formatAddress = (ubs: Ubs) => {
  if (!ubs.address) return 'Endereço não informado';
  const { street, neighborhood, city, district } = ubs.address;
  return [street, neighborhood, city, district].filter(Boolean).join(', ');
};

export default function Agendamentos() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const [ubsList, setUbsList] = useState<Ubs[]>([]);
  const [vacinas, setVacinas] = useState<Vaccin[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);

  const [ubsLoading, setUbsLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [selectedUbs, setSelectedUbs] = useState<Ubs | null>(null);
  const [selectedVacina, setSelectedVacina] = useState<Vaccin | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableTimesForDate, setAvailableTimesForDate] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setUbsLoading(true);
    api
      .get<Ubs[]>('/api/v1/ubs')
      .then((res) => setUbsList(res.data || []))
      .catch(() => setUbsList([]))
      .finally(() => setUbsLoading(false));
  }, []);

  useEffect(() => {
    setSelectedVacina(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
    setCurrentMonth(new Date());

    if (!selectedUbs) {
      setVacinas([]);
      return;
    }

    api
      .get<Vaccin[]>(`/api/v1/ubs/${selectedUbs.id}/vaccins`)
      .then((res) => setVacinas(res.data || []))
      .catch(() => setVacinas([]));
  }, [selectedUbs]);

  useEffect(() => {
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);

    if (!selectedUbs) return;

    setCalendarLoading(true);
    api
      .get<Slot[]>('/api/v1/appointment/availableTime', { params: { ubsId: selectedUbs.id } })
      .then((res) => setAvailableSlots(res.data || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setCalendarLoading(false));
  }, [selectedUbs]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimesForDate([]);
      setSelectedTime(null);
      return;
    }

    const horarios = availableSlots
      .filter((slot) => slot.date === selectedDate)
      .map((slot) => slot.time);

    setAvailableTimesForDate([...new Set(horarios)]);
    setSelectedTime(null);
  }, [selectedDate, availableSlots]);

  const enabledDatesSet = useMemo(
    () => new Set(availableSlots.map((slot) => slot.date)),
    [availableSlots]
  );

  const filteredUbs = useMemo(() => {
    if (!searchTerm) return ubsList;

    const lowerTerm = searchTerm.toLowerCase();
    return ubsList.filter((ubs) => {
      const name = (ubs.ubsName || ubs.name || '').toLowerCase();
      const address = formatAddress(ubs).toLowerCase();
      return name.includes(lowerTerm) || address.includes(lowerTerm);
    });
  }, [searchTerm, ubsList]);

  const calendarMatrix = useMemo(() => buildCalendarMatrix(currentMonth), [currentMonth]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const handleSelectDate = (date: string) => {
    if (!enabledDatesSet.has(date)) return;
    setSelectedDate(date);
  };

  const handleConfirmBooking = async () => {
    if (!selectedUbs || !selectedVacina || !selectedDate || !selectedTime) {
      Alert.alert('Atenção', 'Selecione UBS, vacina, data e horário.');
      return;
    }

    setBookingLoading(true);
    try {
      await api.post('/api/v1/appointment', {
        ubsId: selectedUbs.id,
        vaccinId: selectedVacina.id,
        date: `${selectedDate}T${selectedTime}`,
        status: 'scheduled',
      });

      setModalVisible(true);
      setSelectedUbs(null);
      setSelectedVacina(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setSearchTerm('');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o agendamento. Tente novamente.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#fff' }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agendar</Text>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[globalStyles.container, styles.contentContainer]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>Escolha o posto mais próximo</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#022757" />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Pesquisar por postos"
            placeholderTextColor="#8E98AE"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UBSs na sua região</Text>
          {ubsLoading ? (
            <ActivityIndicator color="#022757" style={{ marginTop: 20 }} />
          ) : filteredUbs.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum posto encontrado.</Text>
          ) : (
            filteredUbs.map((ubs) => {
              const isSelected = selectedUbs?.id === ubs.id;
              return (
                <TouchableOpacity
                  key={ubs.id}
                  style={[styles.ubsCard, isSelected && styles.ubsCardSelected]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedUbs(ubs)}
                >
                  <View style={styles.ubsIconWrapper}>
                    <FontAwesome6 name="hospital" size={28} color="#022757" />
                  </View>
                  <View style={styles.ubsInfo}>
                    <Text style={styles.ubsName}>{ubs.ubsName || ubs.name}</Text>
                    <Text style={styles.ubsAddress}>{formatAddress(ubs)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vacinas disponíveis</Text>
          {!selectedUbs ? (
            <Text style={styles.helperText}>Selecione uma UBS para ver as vacinas.</Text>
          ) : vacinas.length === 0 ? (
            <Text style={styles.helperText}>Nenhuma vacina disponível neste posto.</Text>
          ) : (
            <View style={styles.vaccineChipsWrapper}>
              {vacinas.map((vacina) => {
                const isSelected = selectedVacina?.id === vacina.id;
                return (
                  <TouchableOpacity
                    key={vacina.id}
                    style={[styles.vaccineChip, isSelected && styles.vaccineChipSelected]}
                    onPress={() => setSelectedVacina(vacina)}
                  >
                    <Text style={[styles.vaccineChipText, isSelected && styles.vaccineChipTextSelected]}>
                      {vacina.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Selecione a data</Text>
            <View style={styles.monthSwitcher}>
              <TouchableOpacity style={styles.monthButton} onPress={() => handleMonthChange('prev')}>
                <Ionicons name="chevron-back" size={16} color="#022757" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{getMonthLabel(currentMonth)}</Text>
              <TouchableOpacity style={styles.monthButton} onPress={() => handleMonthChange('next')}>
                <Ionicons name="chevron-forward" size={16} color="#022757" />
              </TouchableOpacity>
            </View>
          </View>

          {calendarLoading ? (
            <ActivityIndicator color="#022757" style={{ marginTop: 20 }} />
          ) : !selectedUbs ? (
            <Text style={styles.helperText}>Escolha uma UBS primeiro para ver as datas disponíveis.</Text>
          ) : (
            <View style={styles.calendarContainer}>
              <View style={styles.weekHeader}>
                {daysOfWeek.map((day) => (
                  <Text key={day} style={styles.weekDayText}>
                    {day}
                  </Text>
                ))}
              </View>

              {calendarMatrix.map((week, index) => (
                <View key={index} style={styles.weekRow}>
                  {week.map((day) => {
                    const fullDate = formatISODate(day);
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isEnabled = isCurrentMonth && enabledDatesSet.has(fullDate);
                    const isSelected = selectedDate === fullDate;

                    return (
                      <TouchableOpacity
                        key={fullDate + index}
                        disabled={!isEnabled}
                        onPress={() => handleSelectDate(fullDate)}
                        style={[
                          styles.dayCell,
                          !isCurrentMonth && styles.dayCellDisabled,
                          isEnabled && styles.dayCellEnabled,
                          isSelected && styles.dayCellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            !isCurrentMonth && styles.dayTextDisabled,
                            isEnabled && styles.dayTextEnabled,
                            isSelected && styles.dayTextSelected,
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horários disponíveis</Text>
          {!selectedDate ? (
            <Text style={styles.helperText}>Escolha uma data para listar os horários.</Text>
          ) : availableTimesForDate.length === 0 ? (
            <Text style={styles.helperText}>Não há horários para esta data.</Text>
          ) : (
            <View style={styles.timeChipsWrapper}>
              {availableTimesForDate.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !(selectedUbs && selectedVacina && selectedDate && selectedTime) && styles.primaryButtonDisabled,
          ]}
          disabled={!(selectedUbs && selectedVacina && selectedDate && selectedTime) || bookingLoading}
          onPress={handleConfirmBooking}
        >
          <Text style={styles.primaryButtonText}>
            {bookingLoading ? 'Agendando...' : 'Agendar Vacina'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <SuccessModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        message="Agendamento realizado com sucesso!"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#022757',
    paddingTop: Platform.select({ ios: 56, android: 32, default: 32 }),
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  subtitle: {
    color: '#657198',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#022757',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#022757',
    fontSize: 14,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#022757',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    color: '#657198',
    fontSize: 14,
  },
  emptyText: {
    color: '#657198',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  ubsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E0E5F2',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  ubsCardSelected: {
    borderColor: '#022757',
  },
  ubsIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E6EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ubsInfo: {
    flex: 1,
    gap: 4,
  },
  ubsName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#022757',
  },
  ubsAddress: {
    fontSize: 13,
    color: '#657198',
  },
  vaccineChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vaccineChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E5F2',
    backgroundColor: '#fff',
  },
  vaccineChipSelected: {
    backgroundColor: '#022757',
    borderColor: '#022757',
  },
  vaccineChipText: {
    fontSize: 14,
    color: '#022757',
    fontWeight: '500',
  },
  vaccineChipTextSelected: {
    color: '#fff',
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E5F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  monthLabel: {
    color: '#022757',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  calendarContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E5F2',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#A2AAC6',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellEnabled: {
    backgroundColor: '#F5F7FF',
  },
  dayCellSelected: {
    backgroundColor: '#022757',
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: '#022757',
    fontWeight: '500',
  },
  dayTextEnabled: {
    color: '#022757',
  },
  dayTextSelected: {
    color: '#fff',
  },
  dayTextDisabled: {
    color: '#A2AAC6',
  },
  timeChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F5F7FF',
  },
  timeChipSelected: {
    backgroundColor: '#022757',
  },
  timeChipText: {
    color: '#022757',
    fontWeight: '500',
  },
  timeChipTextSelected: {
    color: '#fff',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#022757',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#B8C1D9',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
