export type ProfessionalCategory = 'LAWYER' | 'TAX_ACCOUNTANT' | 'APPRAISER' | 'CONSULTANT' | 'BROKER'
export type ConsultationStatus = 'REQUESTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Professional {
  id: string
  user_id: string
  name: string
  category: ProfessionalCategory
  specialties: string[]
  license_number?: string
  firm_name?: string
  bio?: string
  rating: number
  review_count: number
  verified: boolean
  created_at: string
}

export interface ProfessionalService {
  id: string
  professional_id: string
  title: string
  description: string
  price: number
  duration_minutes: number
  category: string
  active: boolean
}

export interface Consultation {
  id: string
  service_id: string
  professional_id: string
  client_id: string
  status: ConsultationStatus
  scheduled_at?: string
  notes?: string
  rating?: number
  created_at: string
}
