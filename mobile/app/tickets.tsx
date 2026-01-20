import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import QRCode from 'react-qr-code';
import { Ticket, Train, MapPin } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../constants/design';
import { blink } from '../lib/blink';

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    const user = await blink.auth.me();
    if (user) {
      const { data } = await blink.db.tickets.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' }
      });
      setTickets(data || []);
    }
  };

  const renderTicket = ({ item }: { item: any }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketMain}>
        <View style={styles.ticketHeader}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          <Text style={styles.fareText}>RM {item.fare.toFixed(2)}</Text>
        </View>
        
        <View style={styles.routeContainer}>
          <View style={styles.stationRow}>
            <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
            <Text style={styles.stationName}>{item.from_station_id}</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.stationRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={styles.stationName}>{item.to_station_id}</Text>
          </View>
        </View>
      </View>

      <View style={styles.qrContainer}>
        <QRCode value={item.qr_code} size={80} />
        <Text style={styles.ticketId}>{item.id}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ticket size={48} color={colors.textMuted} opacity={0.3} />
            <Text style={styles.emptyText}>No active tickets found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    padding: spacing.lg,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: spacing.md,
    ...shadows.md,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  ticketMain: {
    flex: 1,
    padding: spacing.lg,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  fareText: {
    ...typography.h3,
    color: colors.text,
  },
  routeContainer: {
    gap: 4,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  line: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
    marginLeft: 3.5,
  },
  qrContainer: {
    backgroundColor: '#F4F4F5',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  ticketId: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 4,
    color: colors.textMuted,
  },
  emptyState: {
    padding: 100,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
