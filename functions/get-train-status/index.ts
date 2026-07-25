import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const liveLines = ['MRT Putrajaya', 'Kelana Jaya', 'Kajang', 'Ampang', 'Sri Petaling', 'Monorail', 'KTM Komuter'];
  const status = [
    ...liveLines.map(line => ({
      line,
      status: Math.random() > 0.1 ? 'Normal' : 'Delayed',
      waitingTime: Math.floor(Math.random() * 8) + 1,
      crowdLevel: ['Low', 'Moderate', 'High'][Math.floor(Math.random() * 3)],
      dataAvailable: true,
    })),
    {
      line: 'Shah Alam',
      status: 'No Data',
      waitingTime: 0,
      crowdLevel: 'Unknown',
      dataAvailable: false,
    },
  ];

  return new Response(
    JSON.stringify(status),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    },
  )
})
