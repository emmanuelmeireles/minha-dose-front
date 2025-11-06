// Tela de Agendamento integrada com backend real — agendamentos.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, FlatList,
  KeyboardAvoidingView, ScrollView, Platform, StyleSheet
} from 'react-native';
import api from '../../../api/api'; // Seu wrapper do axios/fetch
import SuccessModal from '../../../components/SuccessModal';
import { globalStyles } from '../../../global';

// LEGENDAS DE ENDPOINTS DA COLLECTION DO BACKEND
// 🔹 Listar UBSs disponíveis:         GET /api/v1/ubs
// 🔹 Listar vacinas da UBS:           GET /api/v1/ubs/:ubsId/vaccins
// 🔹 Buscar horários p/ UBS:          GET /api/v1/appointment/availableTime?ubsId=ID
// 🔹 Criar agendamento:               POST /api/v1/appointment

export default function Agendamentos() {
  // Vacinas disponíveis para a UBS selecionada
  const [vacinas, setVacinas] = useState<any[]>([]);
  // Lista das UBSs
  const [ubsList, setUbsList] = useState<any[]>([]);
  const [ubsLoading, setUbsLoading] = useState(false);
  // Estado de seleção
  const [selectedUbs, setSelectedUbs] = useState<any | null>(null);
  const [selectedVacina, setSelectedVacina] = useState<any | null>(null);
  // Slots e datas/hora disponíveis
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  // Seleção de data e horário
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableTimesForDate, setAvailableTimesForDate] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  // Status do agendamento
  const [bookingLoading, setBookingLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Lista UBSs do backend no início
  useEffect(() => {
    setUbsLoading(true);
    api.get('/api/v1/ubs')
      .then(res => setUbsList(res.data || []))
      .catch(() => setUbsList([]))
      .finally(() => setUbsLoading(false));
  }, []);

  // Quando selecionar UBS, buscar vacinas e limpar seleção anterior
  useEffect(() => {
    setSelectedVacina(null);
    setAvailableSlots([]);
    setSelectedDate(null);
    setSelectedTime(null);
    if (!selectedUbs) return;
    api.get(`/api/v1/ubs/${selectedUbs.id}/vaccins`)
      .then(res => setVacinas(res.data || []))
      .catch(() => setVacinas([]));
  }, [selectedUbs]);

  // Quando selecionar UBS, buscar slots de disponibilidade
  useEffect(() => {
    setAvailableSlots([]);
    setSelectedDate(null);
    setSelectedTime(null);
    if (!selectedUbs) return;
    setCalendarLoading(true);
    api.get('/api/v1/appointment/availableTime', { params: { ubsId: selectedUbs.id } })
      .then(res => {
        // Resposta esperada: [{date: '2025-11-20', time: '10:00'}, ...]
        setAvailableSlots(res.data || []);
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setCalendarLoading(false));
  }, [selectedUbs]);

  // Atualiza horários válidos ao escolher data
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimesForDate([]);
      setSelectedTime(null);
      return;
    }
    const horarios = availableSlots
      .filter(s => s.date === selectedDate)
      .map(s => s.time);
    setAvailableTimesForDate(horarios);
    setSelectedTime(null);
  }, [selectedDate, availableSlots]);

  // Monta lista de datas válidas
  const enabledDatesSet = useMemo(() => {
    return new Set(availableSlots.map(slot => slot.date));
  }, [availableSlots]);

  // Realiza a criação do agendamento
  async function handleConfirmBooking() {
    if (!selectedUbs || !selectedVacina || !selectedDate || !selectedTime) {
      return alert('Selecione UBS, vacina, data e horário.');
    }
    setBookingLoading(true);
    try {
      await api.post('/api/v1/appointment', {
        ubsId: selectedUbs.id,
        vaccinId: selectedVacina.id, // Usando id da vacina selecionada!
        date: `${selectedDate}T${selectedTime}`,
        status: 'scheduled'
        // Adapte caso precise enviar userId
      });
      setModalVisible(true);
      // Reset
      setSelectedUbs(null);
      setSelectedVacina(null);
      setSelectedDate(null);
      setSelectedTime(null);
    } catch {
      alert('Erro ao criar agendamento.');
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[globalStyles.container, styles.container]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView>
        <Text style={styles.title}>Agendamento de Vacinação</Text>

        {/* UBSs disponíveis — GET /api/v1/ubs */}
        <Text style={styles.label}>UBSs disponíveis</Text>
        {ubsLoading ? <ActivityIndicator /> : (
          <FlatList
            data={ubsList}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[globalStyles.button, selectedUbs?.id === item.id ? { borderWidth: 2, borderColor: '#002C66' } : {}]}
                onPress={() => setSelectedUbs(item)}
              >
                <Text>{item.name}</Text>
              </TouchableOpacity>
            )}
            horizontal
            style={{ marginBottom: 12 }}
            showsHorizontalScrollIndicator={false}
          />
        )}

        {/* Vacinas da UBS — GET /api/v1/ubs/:ubsId/vaccins */}
        <Text style={styles.label}>Vacina</Text>
        <FlatList
          data={vacinas}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[globalStyles.button, selectedVacina?.id === item.id ? { borderWidth: 2, borderColor: '#0075FF' } : {}]}
              onPress={() => setSelectedVacina(item)}
              disabled={!selectedUbs}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
          horizontal
          style={{ marginBottom: 12 }}
          showsHorizontalScrollIndicator={false}
        />

        {/* Disponibilidade de dias — GET /api/v1/appointment/availableTime?ubsId */}
        <Text style={styles.label}>Data</Text>
        {calendarLoading ? (<ActivityIndicator />) : (
          <View style={styles.calendarRow}>
            {ubsList.length === 0 || availableSlots.length === 0 && <Text>Escolha uma UBS para ver as datas disponíveis.</Text>}
            {Array.from(enabledDatesSet).map(date => (
              <TouchableOpacity
                key={date}
                disabled={!enabledDatesSet.has(date)}
                style={[
                  styles.dateButton,
                  selectedDate === date ? { backgroundColor: '#002C66', borderColor: '#002C66' } : !enabledDatesSet.has(date) ? { backgroundColor: '#eee' } : {}
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={{ color: selectedDate === date ? '#fff' : '#222' }}>{date}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Slots de hora */}
        <Text style={styles.label}>Horário</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {availableTimesForDate.length === 0 && <Text>Selecione uma data.</Text>}
          {availableTimesForDate.map(hora => (
            <TouchableOpacity
              key={hora}
              disabled={!selectedDate}
              style={[
                styles.timeSlot,
                selectedTime === hora ? { backgroundColor: '#002C66' } : {}
              ]}
              onPress={() => setSelectedTime(hora)}
            >
              <Text style={{ color: selectedTime === hora ? '#fff' : '#222' }}>{hora}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Botão de confirmação */}
        <TouchableOpacity
          style={[
            globalStyles.buttonCadastro,
            styles.confirmButton,
            !(selectedUbs && selectedVacina && selectedDate && selectedTime) && { backgroundColor: '#ccc' }
          ]}
          disabled={!(selectedUbs && selectedVacina && selectedDate && selectedTime)}
          onPress={handleConfirmBooking}
        >
          <Text style={globalStyles.buttonCadastroText}>{bookingLoading ? 'Agendando...' : 'Confirmar Agendamento'}</Text>
        </TouchableOpacity>

        <SuccessModal visible={modalVisible} onClose={() => setModalVisible(false)} message="Agendamento realizado com sucesso!" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// -----
const styles = StyleSheet.create({
  container: { paddingTop: 20 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#022757',
    marginBottom: 16,
  },
  label: {
    color: '#022757',
    fontWeight: '600',
    marginBottom: 6,
  },
  calendarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    margin: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  timeSlot: {
    padding: 8,
    borderRadius: 6,
    margin: 3,
    backgroundColor: '#f5f5f5',
  },
  confirmButton: { marginTop: 18 },
});
