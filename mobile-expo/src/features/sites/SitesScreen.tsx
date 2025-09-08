import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { getSites } from '../../api/endpoints';
import { useQuery } from '@tanstack/react-query';

export default function SitesScreen() {
  const { data: sites, isLoading } = useQuery(['sites'], getSites);
  if (isLoading) return <View><Text>Loading...</Text></View>;
  return (
    <FlatList
      data={sites}
      keyExtractor={(item) => String(item.site_id)}
      renderItem={({ item }) => (
        <TouchableOpacity>
          <View style={{ padding: 12 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
            <Text>{item.city}, {item.state}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}
