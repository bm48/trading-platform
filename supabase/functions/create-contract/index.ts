import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const body = await req.json()

    // Generate contract number
    const contractNumber = `CONTRACT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Map frontend camelCase to database snake_case
    const contractData = {
      user_id: user.id,
      title: body.title,
      contract_num: contractNumber,
      client_name: body.clientName,
      project_descr: body.projectDescription,
      value: parseFloat(body.value) || 0,
      start_date: body.startDate ? new Date(body.startDate).toISOString() : null,
      end_date: body.endDate ? new Date(body.endDate).toISOString() : null,
      terms: body.terms || {},
      status: 'draft',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert contract into database
    const { data: newContract, error } = await supabaseClient
      .from('contracts')
      .insert(contractData)
      .select()
      .single()

    if (error) {
      console.error('Error creating contract:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create contract', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create timeline event
    await supabaseClient
      .from('timeline_events')
      .insert({
        contract_id: newContract.id,
        event_type: 'contract_created',
        title: 'Contract Created',
        description: `New contract "${body.title}" has been created`,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify(newContract),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-contract function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})