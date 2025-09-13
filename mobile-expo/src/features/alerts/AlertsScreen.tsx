import React from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { getAlerts } from '../../api/endpoints';
import type { AlertOpen } from '../../types/api';
import { useAuth } from '../../auth/AuthContext';

type AlertItem = AlertOpen;

export default function AlertsScreen() {
  const { user } = useAuth();
  const siteId = 1006; // Default site, should come from user context

  const { data: alerts = [], isLoading, refetch } = useQuery<AlertOpen[]>({
    queryKey: ['alerts', siteId],
    queryFn: () => getAlerts(siteId, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    refetchInterval: 30000,
  });

  const handleAlertPress = (alert: AlertItem) => {
    Alert.alert(
      alert.code,
      `Level: ${alert.level}\nAsset: ${alert.asset_type || 'Unknown'}\nZone: ${alert.zone_label || 'Unknown'}`,
      [
        { text: 'Acknowledge', style: 'default' },
        { text: 'Create Ticket', style: 'default' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getSeverityColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return '#E53E3E';
      case 'major': return '#DD6B20';
      case 'minor': return '#D69E2E';
      default: return '#A0AEC0';
    }
  };

  const renderAlert = ({ item }: { item: AlertItem }) => (
    <TouchableOpacity
      style={[styles.alertCard, { borderLeftColor: getSeverityColor(item.level) }]}
      onPress={() => handleAlertPress(item)}
    >
      <View style={styles.alertHeader}>
        <Text style={styles.alertCode}>{item.code}</Text>
        <Text style={[styles.alertLevel, { color: getSeverityColor(item.level) }]}>
          {item.level.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.alertTime}>
        {new Date(item.raised_at).toLocaleString()}
      </Text>

      <View style={styles.alertDetails}>
        {item.asset_type && (
          <Text style={styles.alertDetail}>Asset: {item.asset_type}</Text>
        )}
        {item.zone_label && (
          <Text style={styles.alertDetail}>Zone: {item.zone_label}</Text>
        )}
        {item.ticket_id && (
          <Text style={styles.alertDetail}>Ticket: #{item.ticket_id}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        <Text style={styles.headerSubtitle}>
          {alerts.length} active alerts
        </Text>
      </View>

      <FlatList
  data={alerts}
        keyExtractor={(item) => item.alert_id}
        renderItem={renderAlert}
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
            <Text style={styles.emptyText}>No active alerts</Text>
            <Text style={styles.emptySubtext}>All systems operating normally</Text>
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
  alertCard: {
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
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A202C',
  },
  alertLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  alertTime: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
  },
  alertDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  alertDetail: {
    fontSize: 14,
    color: '#4A5568',
    marginRight: 16,
    marginBottom: 4,
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
