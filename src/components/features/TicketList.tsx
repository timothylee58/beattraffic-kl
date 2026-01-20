import React, { useState, useEffect } from 'react';
import { Ticket, Clock, MapPin, QrCode as QrIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { blink } from '../../lib/blink';
import { useAuth } from '../../hooks/useAuth';
import QRCode from 'react-qr-code';

interface TicketData {
  id: string;
  from_station_id: string;
  to_station_id: string;
  fare: number;
  status: string;
  qr_code: string;
  created_at: string;
  from_name?: string;
  to_name?: string;
}

export function TicketList() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      // Join with stations to get names
      const { data } = await blink.db.tickets.list({
        where: { user_id: user?.id },
        orderBy: { created_at: 'desc' }
      });

      // Fetch station names for display
      const { data: stations } = await blink.db.stations.list();
      const stationMap = new Map(stations?.map(s => [s.id, s.name]));

      const enrichedTickets = data?.map(ticket => ({
        ...ticket,
        from_name: stationMap.get(ticket.from_station_id),
        to_name: stationMap.get(ticket.to_station_id)
      }));

      setTickets(enrichedTickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
        <Ticket className="h-6 w-6" />
        My Tickets
      </h2>

      {tickets.length === 0 ? (
        <Card className="bg-secondary/20 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <Ticket className="h-12 w-12 text-muted-foreground opacity-20" />
            <div className="space-y-1">
              <p className="font-semibold text-muted-foreground">No active tickets</p>
              <p className="text-sm text-muted-foreground/60">Your purchased tickets will appear here.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
              <CardContent className="p-0 flex">
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">{ticket.status}</p>
                      <p className="text-lg font-bold">RM {ticket.fare.toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <p className="text-sm font-medium">{ticket.from_name}</p>
                    </div>
                    <div className="w-px h-4 bg-border ml-[3px]" />
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{ticket.to_name}</p>
                    </div>
                  </div>
                </div>

                <div className="w-32 bg-secondary flex flex-col items-center justify-center p-4 gap-2 border-l">
                  <div className="bg-white p-1 rounded shadow-sm">
                    <QRCode value={ticket.qr_code} size={64} />
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground truncate w-full text-center">
                    {ticket.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
