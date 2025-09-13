import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getSites } from '../../api/endpoints';
import type { Site } from '../../types/api';
import { useAuth } from '../../auth/AuthContext';

type SiteItem = Site;

export default function SitesScreen() {
  const { user } = useAuth();

  const { data: sites = [], isLoading, refetch, error } = useQuery<SiteItem[]>({
    queryKey: ['sites'],
    queryFn: getSites,
    refetchInterval: 300000,
  });

  const handleSitePress = (site: SiteItem) => {
    Alert.alert(
      site.name,
      `${site.city}, ${site.state}\nTimezone: ${site.tz || 'Unknown'}`,
      [
        { text: 'View Dashboard', style: 'default' },
        { text: 'View Assets', style: 'default' },
        { text: 'View Alerts', style: 'default' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderSite = ({ item }: { item: SiteItem }) => (
    <TouchableOpacity
      style={styles.siteCard}
      onPress={() => handleSitePress(item)}
    >
      <View style={styles.siteHeader}>
        <Text style={styles.siteName}>{item.name}</Text>
        <Text style={styles.siteId}>ID: {item.site_id}</Text>
      </View>

      <View style={styles.siteDetails}>
        <Text style={styles.siteLocation}>
          📍 {item.city || 'Unknown'}, {item.state || 'Unknown'}
        </Text>
        <Text style={styles.siteTimezone}>
          🕐 {item.tz || 'Timezone not set'}
        </Text>
      </View>

      <View style={styles.siteActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Assets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Alerts</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load sites</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading sites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sites</Text>
        <Text style={styles.headerSubtitle}>
          {sites.length} locations
        </Text>
      </View>

      <FlatList
  data={sites}
        keyExtractor={(item) => item.site_id.toString()}
        renderItem={renderSite}
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
            <Text style={styles.emptyText}>No sites found</Text>
            <Text style={styles.emptySubtext}>Check your connection and try again</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#E53E3E',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  siteName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  siteId: {
    fontSize: 14,
    color: '#718096',
  },
  siteDetails: {
    marginBottom: 16,
  },
  siteLocation: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 4,
  },
  siteTimezone: {
    fontSize: 14,
    color: '#718096',
  },
  siteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
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
