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

    // Generate case number
    const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Map frontend camelCase to database snake_case
    const caseData = {
      user_id: user.id,
      title: body.title,
      case_number: caseNumber,
      issue_type: body.issueType,
      description: body.description,
      amount: body.amount,
      status: 'active',
      priority: 'medium',
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert case into database
    const { data: newCase, error } = await supabaseClient
      .from('cases')
      .insert(caseData)
      .select()
      .single()

    if (error) {
      console.error('Error creating case:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create case', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create timeline event
    await supabaseClient
      .from('timeline_events')
      .insert({
        case_id: newCase.id,
        event_type: 'case_created',
        title: 'Case Created',
        description: `New case "${body.title}" has been created`,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify(newCase),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-case function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})