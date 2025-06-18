import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// User management functions
export const userManagement = {
  createUser: async (email: string, password: string, userData: any) => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: userData,
      email_confirm: true
    })
    return { data, error }
  },

  getUserById: async (userId: string) => {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    return { data, error }
  },

  updateUser: async (userId: string, updates: any) => {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates)
    return { data, error }
  },

  deleteUser: async (userId: string) => {
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    return { data, error }
  },

  listUsers: async (page = 1, perPage = 50) => {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    })
    return { data, error }
  },

  setUserRole: async (userId: string, role: string) => {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role }
    })
    return { data, error }
  }
}

// Database operations
export const database = {
  // Applications
  createApplication: async (applicationData: any) => {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert(applicationData)
      .select()
      .single()
    return { data, error }
  },

  getApplications: async (userId?: string) => {
    let query = supabaseAdmin.from('applications').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    return { data, error }
  },

  updateApplication: async (id: number, updates: any) => {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Cases
  createCase: async (caseData: any) => {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .insert(caseData)
      .select()
      .single()
    return { data, error }
  },

  getCases: async (userId?: string) => {
    let query = supabaseAdmin.from('cases').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    return { data, error }
  },

  updateCase: async (id: number, updates: any) => {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Contracts
  createContract: async (contractData: any) => {
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .insert(contractData)
      .select()
      .single()
    return { data, error }
  },

  getContracts: async (userId?: string) => {
    let query = supabaseAdmin.from('contracts').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    return { data, error }
  },

  getContract: async (id: number) => {
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  updateContract: async (id: number, updates: any) => {
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Documents
  createDocument: async (documentData: any) => {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert(documentData)
      .select()
      .single()
    return { data, error }
  },

  getDocuments: async (userId?: string, caseId?: number, contractId?: number) => {
    let query = supabaseAdmin.from('documents').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (caseId) {
      query = query.eq('case_id', caseId)
    }
    if (contractId) {
      query = query.eq('contract_id', contractId)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    return { data, error }
  },

  deleteDocument: async (id: number) => {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  }
}