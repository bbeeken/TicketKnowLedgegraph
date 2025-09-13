import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTicket,
  getTicketMessages,
  postTicketMessage,
  patchTicketType,
} from '../../api/endpoints';
import type { TicketDetail } from '../../types/api';

const TYPE_OPTIONS = [
  { id: 1, name: 'Help Request' },
  { id: 2, name: 'User Change Request' },
  { id: 3, name: 'Purchase Request' },
  { id: 4, name: 'Vendor Service Request' },
];

export default function TicketDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const ticketId: number = route.params?.ticketId;
  const qc = useQueryClient();

  const { data: ticket } = useQuery<TicketDetail>({
    queryKey: ['ticket', ticketId],
    queryFn: () => getTicket(ticketId),
  });

  const {
    data: messages = [],
    isFetching: isFetchingMessages,
    refetch: refetchMessages,
  } = useQuery<any[]>({
    queryKey: ['ticket-messages', ticketId],
    queryFn: () => getTicketMessages(ticketId, 0, 100),
    refetchInterval: 30000,
  });

  const [text, setText] = useState('');

  const sendMutation = useMutation({
    mutationFn: (body: string) => postTicketMessage(ticketId, body),
    onSuccess: async () => {
      setText('');
      await qc.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
      refetchMessages();
    },
  });

  const typeMutation = useMutation({
    mutationFn: (type_id: number) => patchTicketType(ticketId, type_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });

  const headerTitle = useMemo(() => {
    const no = ticket?.ticket_no || `OG-${String(ticketId).padStart(7, '0')}`;
    return no;
  }, [ticket, ticketId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          {ticket?.status ? (
            <View style={[styles.statusBadge]}>
              <Text style={styles.statusText}>{ticket.status}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Type selector */}
      <View style={styles.typeRow}>
        <Text style={styles.typeLabel}>Type:</Text>
        <View style={styles.typeOptions}>
          {TYPE_OPTIONS.map((t) => {
            const selected = (ticket as any)?.type_id === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typePill, selected && styles.typePillActive]}
                onPress={() => typeMutation.mutate(t.id)}
              >
                <Text style={[styles.typePillText, selected && styles.typePillTextActive]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item, idx) => String(item.comment_id ?? idx)}
        contentContainerStyle={styles.list}
        refreshing={isFetchingMessages}
        onRefresh={refetchMessages}
        renderItem={({ item }) => (
          <View style={styles.msgCard}>
            <Text style={styles.msgMeta}>
              {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
            </Text>
            <Text style={styles.msgBody}>
              {item.body_text || item.body || (item.body_html ? stripHtml(item.body_html) : '')}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
      />

      {/* Composer */}
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
            disabled={!text.trim() || sendMutation.isPending}
            onPress={() => sendMutation.mutate(text.trim())}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { padding: 8 },
  backText: { color: '#3182CE', fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A202C' },
  statusBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#3182CE' },
  statusText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  typeRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  typeLabel: { fontSize: 14, color: '#4A5568', marginBottom: 8, fontWeight: '600' },
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap' },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    backgroundColor: '#EDF2F7',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  typePillActive: { backgroundColor: '#3182CE', borderColor: '#3182CE' },
  typePillText: { fontSize: 12, color: '#2D3748' },
  typePillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  list: { padding: 12 },
  msgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  msgMeta: { fontSize: 12, color: '#718096', marginBottom: 6 },
  msgBody: { fontSize: 15, color: '#1A202C', lineHeight: 20 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#718096' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendBtnDisabled: { backgroundColor: '#A0AEC0' },
  sendText: { color: '#FFFFFF', fontWeight: '700' },
});
