import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getTickets } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';

interface TicketItem {
  ticket_id: number;
  ticket_no?: string;
  status: string;
  priority: number;
  severity: number;
  summary?: string;
  site_id?: number;
  created_at?: string;
  updated_at?: string;
}

export default function TicketsScreen() {
  const navigation = useNavigation() as any;
  const { user } = useAuth();
  const siteId = 1006; // Default site, should come from user context
  const [statusFilter, setStatusFilter] = useState('open');

  const { data: tickets = [], isLoading, refetch } = useQuery<TicketItem[]>({
    queryKey: ['tickets', siteId, statusFilter],
    queryFn: () => getTickets(siteId, statusFilter),
    refetchInterval: 60000,
  });

  const handleTicketPress = (ticket: TicketItem) => {
    navigation.navigate('TicketDetail', { ticketId: ticket.ticket_id });
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return '#E53E3E';
    if (priority >= 4) return '#DD6B20';
    if (priority >= 3) return '#D69E2E';
    return '#48BB78';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return '#3182CE';
      case 'in progress': return '#38B2AC';
      case 'resolved': return '#48BB78';
      case 'closed': return '#9F7AEA';
      default: return '#A0AEC0';
    }
  };

  const renderTicket = ({ item }: { item: TicketItem }) => (
    <TouchableOpacity
      style={[styles.ticketCard, { borderLeftColor: getPriorityColor(item.priority) }]}
      onPress={() => handleTicketPress(item)}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketNumber}>
          {item.ticket_no || `OG-${String(item.ticket_id).padStart(7, '0')}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.ticketSummary} numberOfLines={2}>
        {item.summary || 'No summary available'}
      </Text>

      <View style={styles.ticketMeta}>
        <Text style={styles.ticketMetaText}>
          Priority: {item.priority}/5
        </Text>
        <Text style={styles.ticketMetaText}>
          Severity: {item.severity}/5
        </Text>
      </View>

      <Text style={styles.ticketTime}>
        Updated: {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Unknown'}
      </Text>
    </TouchableOpacity>
  );

  const filterButtons = [
    { key: 'open', label: 'Open' },
    { key: 'in progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tickets</Text>
        <Text style={styles.headerSubtitle}>
          {tickets.length} tickets
        </Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {filterButtons.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              statusFilter === filter.key && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === filter.key && styles.filterButtonTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
  data={tickets}
        keyExtractor={(item) => item.ticket_id.toString()}
        renderItem={renderTicket}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#3182CE"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tickets found</Text>
            <Text style={styles.emptySubtext}>
              {statusFilter === 'open' ? 'All tickets are resolved!' : `No ${statusFilter} tickets`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  filterButtonActive: {
    backgroundColor: '#3182CE',
    borderColor: '#3182CE',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#718096',
  },
  listContainer: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A202C',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  ticketSummary: {
    fontSize: 16,
    color: '#2D3748',
    marginBottom: 12,
    lineHeight: 22,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketMetaText: {
    fontSize: 14,
    color: '#718096',
  },
  ticketTime: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
});
