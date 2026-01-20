import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, ArrowRightLeft, Search, Train, Ticket } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../constants/design';
import { blink } from '../lib/blink';

export default function HomeScreen() {
  const router = useRouter();
  const [stations, setStations] = useState<any[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    const { data } = await blink.db.stations.list();
    setStations(data || []);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Hero Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Where to?</Text>
        <Text style={styles.subtitle}>Plan your journey in KL</Text>
      </View>

      {/* Search Card */}
      <View style={styles.searchCard}>
        <View style={styles.inputContainer}>
          <MapPin size={20} color={colors.destructive} />
          <TextInput 
            style={styles.input} 
            placeholder="From Station" 
            value={from}
            onChangeText={setFrom}
          />
        </View>

        <TouchableOpacity style={styles.swapButton}>
          <ArrowRightLeft size={20} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <MapPin size={20} color={colors.primary} />
          <TextInput 
            style={styles.input} 
            placeholder="To Station" 
            value={to}
            onChangeText={setTo}
          />
        </View>

        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => {/* Navigate to search results */}}
        >
          <Search size={20} color="#fff" />
          <Text style={styles.searchButtonText}>Search Routes</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/tickets')}>
          <Ticket size={24} color={colors.primary} />
          <Text style={styles.actionText}>Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Train size={24} color={colors.primary} />
          <Text style={styles.actionText}>Map</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.primary,
    paddingBottom: 60,
  },
  title: {
    ...typography.h1,
    color: '#fff',
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
  },
  searchCard: {
    margin: spacing.lg,
    marginTop: -40,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    ...shadows.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
  },
  swapButton: {
    alignSelf: 'center',
    marginVertical: -10,
    zIndex: 1,
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  actionText: {
    fontWeight: '600',
    color: colors.text,
  },
});
