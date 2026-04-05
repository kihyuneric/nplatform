export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_analysis_results: {
        Row: {
          analysis_type: string
          confidence_score: number | null
          created_at: string | null
          error_message: string | null
          id: string
          input_params: Json | null
          listing_id: string | null
          model_version: string | null
          processing_time_ms: number | null
          result: Json | null
          result_summary: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          analysis_type: string
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_params?: Json | null
          listing_id?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          result?: Json | null
          result_summary?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_params?: Json | null
          listing_id?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          result?: Json | null
          result_summary?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_results_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string | null
          credits_used: number
          feature: string
          id: string
          input_summary: string | null
          metadata: Json | null
          model_version: string | null
          output_summary: string | null
          response_time_ms: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_used?: number
          feature: string
          id?: string
          input_summary?: string | null
          metadata?: Json | null
          model_version?: string | null
          output_summary?: string | null
          response_time_ms?: number | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_used?: number
          feature?: string
          id?: string
          input_summary?: string | null
          metadata?: Json | null
          model_version?: string | null
          output_summary?: string | null
          response_time_ms?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_settings: {
        Row: {
          channels: Json
          conditions: Json
          created_at: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channels?: Json
          conditions?: Json
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channels?: Json
          conditions?: Json
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_config_audit: {
        Row: {
          action: string
          error_msg: string | null
          field_key: string
          id: string
          ip_address: string | null
          performed_at: string | null
          performed_by: string | null
          provider_id: string
          result: string | null
          user_agent: string | null
          value_hint: string | null
        }
        Insert: {
          action: string
          error_msg?: string | null
          field_key: string
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
          provider_id: string
          result?: string | null
          user_agent?: string | null
          value_hint?: string | null
        }
        Update: {
          action?: string
          error_msg?: string | null
          field_key?: string
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
          provider_id?: string
          result?: string | null
          user_agent?: string | null
          value_hint?: string | null
        }
        Relationships: []
      }
      api_configs: {
        Row: {
          created_at: string | null
          encrypted_value: string
          field_key: string
          id: string
          is_active: boolean | null
          provider_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_value: string
          field_key: string
          id?: string
          is_active?: boolean | null
          provider_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_value?: string
          field_key?: string
          id?: string
          is_active?: boolean | null
          provider_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      api_integration_status: {
        Row: {
          error_message: string | null
          id: string
          last_test_ms: number | null
          last_tested_at: string | null
          monthly_usage: number | null
          provider_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          last_test_ms?: number | null
          last_tested_at?: string | null
          monthly_usage?: number | null
          provider_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          last_test_ms?: number | null
          last_tested_at?: string | null
          monthly_usage?: number | null
          provider_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      auction_case: {
        Row: {
          actual_profit: number | null
          actual_roi: number | null
          address: string | null
          appraisal_price: number | null
          area_sqm: number | null
          bid_rate: number | null
          confidence_score: number | null
          created_at: string | null
          discount_rate: number | null
          expected_profit: number | null
          expected_roi: number | null
          expert_opinion: string | null
          extraction_model: string | null
          has_legal_issue: boolean | null
          has_lien: boolean | null
          has_opposing_power: boolean | null
          has_tenant: boolean | null
          id: number
          location_grade: string | null
          market_price: number | null
          near_development: boolean | null
          near_school: boolean | null
          near_station: boolean | null
          negative_keywords: string[] | null
          positive_keywords: string[] | null
          property_type: string | null
          raw_transcript: string | null
          region: string | null
          rental_possible: boolean | null
          result_label: number | null
          result_reason: string | null
          rights_summary: string | null
          risk_factors: string[] | null
          source_channel: string | null
          source_title: string | null
          source_url: string | null
          strategy: string | null
          success_factors: string[] | null
          updated_at: string | null
          upload_date: string | null
          winning_bid: number | null
        }
        Insert: {
          actual_profit?: number | null
          actual_roi?: number | null
          address?: string | null
          appraisal_price?: number | null
          area_sqm?: number | null
          bid_rate?: number | null
          confidence_score?: number | null
          created_at?: string | null
          discount_rate?: number | null
          expected_profit?: number | null
          expected_roi?: number | null
          expert_opinion?: string | null
          extraction_model?: string | null
          has_legal_issue?: boolean | null
          has_lien?: boolean | null
          has_opposing_power?: boolean | null
          has_tenant?: boolean | null
          id?: number
          location_grade?: string | null
          market_price?: number | null
          near_development?: boolean | null
          near_school?: boolean | null
          near_station?: boolean | null
          negative_keywords?: string[] | null
          positive_keywords?: string[] | null
          property_type?: string | null
          raw_transcript?: string | null
          region?: string | null
          rental_possible?: boolean | null
          result_label?: number | null
          result_reason?: string | null
          rights_summary?: string | null
          risk_factors?: string[] | null
          source_channel?: string | null
          source_title?: string | null
          source_url?: string | null
          strategy?: string | null
          success_factors?: string[] | null
          updated_at?: string | null
          upload_date?: string | null
          winning_bid?: number | null
        }
        Update: {
          actual_profit?: number | null
          actual_roi?: number | null
          address?: string | null
          appraisal_price?: number | null
          area_sqm?: number | null
          bid_rate?: number | null
          confidence_score?: number | null
          created_at?: string | null
          discount_rate?: number | null
          expected_profit?: number | null
          expected_roi?: number | null
          expert_opinion?: string | null
          extraction_model?: string | null
          has_legal_issue?: boolean | null
          has_lien?: boolean | null
          has_opposing_power?: boolean | null
          has_tenant?: boolean | null
          id?: number
          location_grade?: string | null
          market_price?: number | null
          near_development?: boolean | null
          near_school?: boolean | null
          near_station?: boolean | null
          negative_keywords?: string[] | null
          positive_keywords?: string[] | null
          property_type?: string | null
          raw_transcript?: string | null
          region?: string | null
          rental_possible?: boolean | null
          result_label?: number | null
          result_reason?: string | null
          rights_summary?: string | null
          risk_factors?: string[] | null
          source_channel?: string | null
          source_title?: string | null
          source_url?: string | null
          strategy?: string | null
          success_factors?: string[] | null
          updated_at?: string | null
          upload_date?: string | null
          winning_bid?: number | null
        }
        Relationships: []
      }
      auction_prediction: {
        Row: {
          appraisal_price: number | null
          bid_price: number | null
          bid_rate: number | null
          created_at: string | null
          has_opposing_power: boolean | null
          has_tenant: boolean | null
          id: number
          near_station: boolean | null
          predicted_label: number | null
          property_type: string | null
          recommendation: string | null
          recommended_bid: number | null
          region: string | null
          risk_analysis: string | null
          similar_cases: number[] | null
          strategy: string | null
          success_probability: number | null
        }
        Insert: {
          appraisal_price?: number | null
          bid_price?: number | null
          bid_rate?: number | null
          created_at?: string | null
          has_opposing_power?: boolean | null
          has_tenant?: boolean | null
          id?: number
          near_station?: boolean | null
          predicted_label?: number | null
          property_type?: string | null
          recommendation?: string | null
          recommended_bid?: number | null
          region?: string | null
          risk_analysis?: string | null
          similar_cases?: number[] | null
          strategy?: string | null
          success_probability?: number | null
        }
        Update: {
          appraisal_price?: number | null
          bid_price?: number | null
          bid_rate?: number | null
          created_at?: string | null
          has_opposing_power?: boolean | null
          has_tenant?: boolean | null
          id?: number
          near_station?: boolean | null
          predicted_label?: number | null
          property_type?: string | null
          recommendation?: string | null
          recommended_bid?: number | null
          region?: string | null
          risk_analysis?: string | null
          similar_cases?: number[] | null
          strategy?: string | null
          success_probability?: number | null
        }
        Relationships: []
      }
      auction_reference: {
        Row: {
          avg_attempt_count: number | null
          avg_bid_ratio: number
          avg_bidder_count: number | null
          created_at: string | null
          created_by: string | null
          district: string | null
          id: string
          is_active: boolean | null
          median_bid_ratio: number | null
          p25_bid_ratio: number | null
          p75_bid_ratio: number | null
          property_type: string
          reference_period: string | null
          region: string
          sample_count: number | null
          source: string | null
          success_rate: number | null
          updated_at: string | null
        }
        Insert: {
          avg_attempt_count?: number | null
          avg_bid_ratio: number
          avg_bidder_count?: number | null
          created_at?: string | null
          created_by?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          median_bid_ratio?: number | null
          p25_bid_ratio?: number | null
          p75_bid_ratio?: number | null
          property_type: string
          reference_period?: string | null
          region: string
          sample_count?: number | null
          source?: string | null
          success_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_attempt_count?: number | null
          avg_bid_ratio?: number
          avg_bidder_count?: number | null
          created_at?: string | null
          created_by?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          median_bid_ratio?: number | null
          p25_bid_ratio?: number | null
          p75_bid_ratio?: number | null
          property_type?: string
          reference_period?: string | null
          region?: string
          sample_count?: number | null
          source?: string | null
          success_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auction_simulations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          params: Json
          results: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          params: Json
          results?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          params?: Json
          results?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_simulations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_statistics: {
        Row: {
          address: string | null
          appraised_value: number | null
          auction_date: string | null
          auction_round: number | null
          auction_type: string | null
          bidder_count: number | null
          case_number: string
          collateral_type: string | null
          court: string | null
          created_at: string | null
          id: string
          minimum_bid: number | null
          raw_data: Json | null
          result: string | null
          sido: string | null
          sigungu: string | null
          source: string | null
          winning_bid: number | null
          winning_rate: number | null
        }
        Insert: {
          address?: string | null
          appraised_value?: number | null
          auction_date?: string | null
          auction_round?: number | null
          auction_type?: string | null
          bidder_count?: number | null
          case_number: string
          collateral_type?: string | null
          court?: string | null
          created_at?: string | null
          id?: string
          minimum_bid?: number | null
          raw_data?: Json | null
          result?: string | null
          sido?: string | null
          sigungu?: string | null
          source?: string | null
          winning_bid?: number | null
          winning_rate?: number | null
        }
        Update: {
          address?: string | null
          appraised_value?: number | null
          auction_date?: string | null
          auction_round?: number | null
          auction_type?: string | null
          bidder_count?: number | null
          case_number?: string
          collateral_type?: string | null
          court?: string | null
          created_at?: string | null
          id?: string
          minimum_bid?: number | null
          raw_data?: Json | null
          result?: string | null
          sido?: string | null
          sigungu?: string | null
          source?: string | null
          winning_bid?: number | null
          winning_rate?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          detail: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          bid_amount: number
          bid_status: string | null
          bidder_id: string | null
          created_at: string | null
          deposit_amount: number | null
          id: string
          insurance_file_url: string | null
          listing_id: string | null
          memo: string | null
          reviewed_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bid_amount: number
          bid_status?: string | null
          bidder_id?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          id?: string
          insurance_file_url?: string | null
          listing_id?: string | null
          memo?: string | null
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bid_amount?: number
          bid_status?: string | null
          bidder_id?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          id?: string
          insurance_file_url?: string | null
          listing_id?: string | null
          memo?: string | null
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          likes: number
          parent_id: string | null
          post_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          likes?: number
          parent_id?: string | null
          post_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          likes?: number
          parent_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          category: string
          comment_count: number
          content: string
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          is_pinned: boolean | null
          likes: number
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          views: number
        }
        Insert: {
          author_id: string
          category?: string
          comment_count?: number
          content: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_pinned?: boolean | null
          likes?: number
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views?: number
        }
        Update: {
          author_id?: string
          category?: string
          comment_count?: number
          content?: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_pinned?: boolean | null
          likes?: number
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resolution: string | null
          resolved_at: string | null
          sla_deadline: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      consent_logs: {
        Row: {
          agreed: boolean
          consent_type: string
          created_at: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          agreed: boolean
          consent_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
          version?: string
        }
        Update: {
          agreed?: boolean
          consent_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      contract_requests: {
        Row: {
          buyer_id: string
          cancellation_reason: string | null
          cooldown_expires_at: string | null
          counter_price: number | null
          created_at: string | null
          deal_room_id: string | null
          deposit_amount: number | null
          deposit_confirmed_at: string | null
          final_price: number | null
          id: string
          listing_id: string
          nda_agreement_id: string | null
          proposed_price: number | null
          seller_id: string
          status: string
          terms: Json | null
          timeline: Json | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          cancellation_reason?: string | null
          cooldown_expires_at?: string | null
          counter_price?: number | null
          created_at?: string | null
          deal_room_id?: string | null
          deposit_amount?: number | null
          deposit_confirmed_at?: string | null
          final_price?: number | null
          id?: string
          listing_id: string
          nda_agreement_id?: string | null
          proposed_price?: number | null
          seller_id: string
          status?: string
          terms?: Json | null
          timeline?: Json | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          cancellation_reason?: string | null
          cooldown_expires_at?: string | null
          counter_price?: number | null
          created_at?: string | null
          deal_room_id?: string | null
          deposit_amount?: number | null
          deposit_confirmed_at?: string | null
          final_price?: number | null
          id?: string
          listing_id?: string
          nda_agreement_id?: string | null
          proposed_price?: number | null
          seller_id?: string
          status?: string
          terms?: Json | null
          timeline?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_requests_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_nda_agreement_id_fkey"
            columns: ["nda_agreement_id"]
            isOneToOne: false
            referencedRelation: "nda_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      court_auctions: {
        Row: {
          appraised_value: number
          attempt_count: number | null
          auction_date: string | null
          bid_ratio: number | null
          bidder_count: number | null
          case_id: string
          court_name: string | null
          created_at: string | null
          district: string | null
          fetched_at: string | null
          id: string
          min_bid_price: number
          property_address: string | null
          property_type: string
          region: string
          result: string
          source: string | null
          winning_bid: number | null
        }
        Insert: {
          appraised_value: number
          attempt_count?: number | null
          auction_date?: string | null
          bid_ratio?: number | null
          bidder_count?: number | null
          case_id: string
          court_name?: string | null
          created_at?: string | null
          district?: string | null
          fetched_at?: string | null
          id?: string
          min_bid_price: number
          property_address?: string | null
          property_type: string
          region: string
          result?: string
          source?: string | null
          winning_bid?: number | null
        }
        Update: {
          appraised_value?: number
          attempt_count?: number | null
          auction_date?: string | null
          bid_ratio?: number | null
          bidder_count?: number | null
          case_id?: string
          court_name?: string | null
          created_at?: string | null
          district?: string | null
          fetched_at?: string | null
          id?: string
          min_bid_price?: number
          property_address?: string | null
          property_type?: string
          region?: string
          result?: string
          source?: string | null
          winning_bid?: number | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          service: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          service?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          service?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_room_messages: {
        Row: {
          content: string
          created_at: string | null
          deal_room_id: string
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_deleted: boolean | null
          message_type: string | null
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deal_room_id: string
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          message_type?: string | null
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deal_room_id?: string
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          message_type?: string | null
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_messages_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "deal_room_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_participants: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          deal_room_id: string
          id: string
          joined_at: string | null
          kyc_verified: boolean | null
          loi_submitted: boolean | null
          nda_signed_at: string | null
          removed_at: string | null
          role: Database["public"]["Enums"]["participant_role"]
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          deal_room_id: string
          id?: string
          joined_at?: string | null
          kyc_verified?: boolean | null
          loi_submitted?: boolean | null
          nda_signed_at?: string | null
          removed_at?: string | null
          role: Database["public"]["Enums"]["participant_role"]
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          deal_room_id?: string
          id?: string
          joined_at?: string | null
          kyc_verified?: boolean | null
          loi_submitted?: boolean | null
          nda_signed_at?: string | null
          removed_at?: string | null
          role?: Database["public"]["Enums"]["participant_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_participants_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_rooms: {
        Row: {
          closed_at: string | null
          communication_locked: boolean | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          download_restricted: boolean | null
          id: string
          listing_id: string | null
          max_participants: number | null
          nda_required: boolean | null
          status: Database["public"]["Enums"]["deal_room_status"] | null
          title: string
          updated_at: string | null
          watermark_enabled: boolean | null
        }
        Insert: {
          closed_at?: string | null
          communication_locked?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          download_restricted?: boolean | null
          id?: string
          listing_id?: string | null
          max_participants?: number | null
          nda_required?: boolean | null
          status?: Database["public"]["Enums"]["deal_room_status"] | null
          title: string
          updated_at?: string | null
          watermark_enabled?: boolean | null
        }
        Update: {
          closed_at?: string | null
          communication_locked?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          download_restricted?: boolean | null
          id?: string
          listing_id?: string | null
          max_participants?: number | null
          nda_required?: boolean | null
          status?: Database["public"]["Enums"]["deal_room_status"] | null
          title?: string
          updated_at?: string | null
          watermark_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rooms_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_surveys: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          avoidance_conditions: Json | null
          budget_total: number | null
          collateral_types: Json
          created_at: string | null
          id: string
          investment_experience:
            | Database["public"]["Enums"]["investment_experience"]
            | null
          matched_count: number | null
          notes: string | null
          preferred_seller_types: Json | null
          recovery_period_months: number | null
          regions: Json
          status: Database["public"]["Enums"]["survey_status"] | null
          target_discount_rate: number | null
          updated_at: string | null
          urgency: Database["public"]["Enums"]["urgency_level"] | null
          user_id: string
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          avoidance_conditions?: Json | null
          budget_total?: number | null
          collateral_types?: Json
          created_at?: string | null
          id?: string
          investment_experience?:
            | Database["public"]["Enums"]["investment_experience"]
            | null
          matched_count?: number | null
          notes?: string | null
          preferred_seller_types?: Json | null
          recovery_period_months?: number | null
          regions?: Json
          status?: Database["public"]["Enums"]["survey_status"] | null
          target_discount_rate?: number | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          user_id: string
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          avoidance_conditions?: Json | null
          budget_total?: number | null
          collateral_types?: Json
          created_at?: string | null
          id?: string
          investment_experience?:
            | Database["public"]["Enums"]["investment_experience"]
            | null
          matched_count?: number | null
          notes?: string | null
          preferred_seller_types?: Json | null
          recovery_period_months?: number | null
          regions?: Json
          status?: Database["public"]["Enums"]["survey_status"] | null
          target_discount_rate?: number | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_surveys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          deal_room_id: string | null
          disclosure_level:
            | Database["public"]["Enums"]["disclosure_level"]
            | null
          download_count: number | null
          file_name: string
          file_path: string
          file_size: number | null
          fingerprint: string | null
          id: string
          listing_id: string | null
          mime_type: string | null
          uploaded_by: string | null
          version: number | null
          watermarked: boolean | null
        }
        Insert: {
          created_at?: string | null
          deal_room_id?: string | null
          disclosure_level?:
            | Database["public"]["Enums"]["disclosure_level"]
            | null
          download_count?: number | null
          file_name: string
          file_path: string
          file_size?: number | null
          fingerprint?: string | null
          id?: string
          listing_id?: string | null
          mime_type?: string | null
          uploaded_by?: string | null
          version?: number | null
          watermarked?: boolean | null
        }
        Update: {
          created_at?: string | null
          deal_room_id?: string | null
          disclosure_level?:
            | Database["public"]["Enums"]["disclosure_level"]
            | null
          download_count?: number | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          fingerprint?: string | null
          id?: string
          listing_id?: string | null
          mime_type?: string | null
          uploaded_by?: string | null
          version?: number | null
          watermarked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_orders: {
        Row: {
          created_at: string | null
          expires_at: string | null
          filled_at: string | null
          filled_quantity: number
          id: string
          listing_id: string
          notes: string | null
          order_type: string
          price: number
          quantity: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          filled_at?: string | null
          filled_quantity?: number
          id?: string
          listing_id: string
          notes?: string | null
          order_type: string
          price: number
          quantity?: number
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          filled_at?: string | null
          filled_quantity?: number
          id?: string
          listing_id?: string
          notes?: string | null
          order_type?: string
          price?: number
          quantity?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_job: {
        Row: {
          completed_at: string | null
          created_at: string | null
          fail_count: number | null
          id: number
          processed_count: number | null
          started_at: string | null
          status: string | null
          success_count: number | null
          total_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          fail_count?: number | null
          id?: number
          processed_count?: number | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          fail_count?: number | null
          id?: number
          processed_count?: number | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_count?: number | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          folder_name: string | null
          id: string
          listing_id: string
          memo: string | null
          price_at_save: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          folder_name?: string | null
          id?: string
          listing_id: string
          memo?: string | null
          price_at_save?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          folder_name?: string | null
          id?: string
          listing_id?: string
          memo?: string | null
          price_at_save?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_profiles: {
        Row: {
          address: string | null
          business_number: string
          business_number_verified: boolean | null
          business_registration_url: string | null
          business_type: string | null
          company_name: string
          created_at: string | null
          id: string
          institution_type: string | null
          kyc_rejection_reason: string | null
          kyc_reviewed_at: string | null
          kyc_reviewed_by: string | null
          kyc_status: string | null
          license_document_url: string | null
          license_number: string | null
          phone: string | null
          representative_name: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_number: string
          business_number_verified?: boolean | null
          business_registration_url?: string | null
          business_type?: string | null
          company_name: string
          created_at?: string | null
          id?: string
          institution_type?: string | null
          kyc_rejection_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: string | null
          license_document_url?: string | null
          license_number?: string | null
          phone?: string | null
          representative_name?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_number?: string
          business_number_verified?: boolean | null
          business_registration_url?: string | null
          business_type?: string | null
          company_name?: string
          created_at?: string | null
          id?: string
          institution_type?: string | null
          kyc_rejection_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: string | null
          license_document_url?: string | null
          license_number?: string | null
          phone?: string | null
          representative_name?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      listing_interests: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_qna: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string | null
          id: string
          listing_id: string | null
          question: string
          questioner_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          question: string
          questioner_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          question?: string
          questioner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_qna_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_qna_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_qna_questioner_id_fkey"
            columns: ["questioner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_results: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          match_factors: Json | null
          match_score: number
          notified_at: string | null
          status: Database["public"]["Enums"]["match_status"] | null
          survey_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          match_factors?: Json | null
          match_score: number
          notified_at?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          survey_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          match_factors?: Json | null
          match_score?: number
          notified_at?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          survey_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matching_results_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_results_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "demand_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_predictions: {
        Row: {
          abs_error: number | null
          actual_ratio: number | null
          actual_value: number | null
          confidence: number | null
          created_at: string | null
          discount_ratio: number | null
          feedback_at: string | null
          id: string
          input_features: Json
          model_name: string
          model_version: string
          pct_error: number | null
          predicted_ratio: number | null
          predicted_value: number | null
          property_id: string | null
          request_id: string | null
          risk_grade: string | null
        }
        Insert: {
          abs_error?: number | null
          actual_ratio?: number | null
          actual_value?: number | null
          confidence?: number | null
          created_at?: string | null
          discount_ratio?: number | null
          feedback_at?: string | null
          id?: string
          input_features: Json
          model_name: string
          model_version: string
          pct_error?: number | null
          predicted_ratio?: number | null
          predicted_value?: number | null
          property_id?: string | null
          request_id?: string | null
          risk_grade?: string | null
        }
        Update: {
          abs_error?: number | null
          actual_ratio?: number | null
          actual_value?: number | null
          confidence?: number | null
          created_at?: string | null
          discount_ratio?: number | null
          feedback_at?: string | null
          id?: string
          input_features?: Json
          model_name?: string
          model_version?: string
          pct_error?: number | null
          predicted_ratio?: number | null
          predicted_value?: number | null
          property_id?: string | null
          request_id?: string | null
          risk_grade?: string | null
        }
        Relationships: []
      }
      ml_training_samples: {
        Row: {
          actual_bid_price: number | null
          actual_bid_ratio: number
          appraised_value: number
          area_category: string | null
          area_sqm: number | null
          auction_case_id: string | null
          avg_bid_ratio_region: number | null
          avg_rent_per_sqm: number | null
          building_age_years: number | null
          collateral_type: string | null
          created_at: string | null
          delinquency_months: number | null
          floor_no: number | null
          id: string
          legal_complexity: number | null
          ltv: number | null
          nbi_index: number | null
          property_type: string
          quality_score: number | null
          region: string
          risk_grade: string | null
          senior_claims_ratio: number | null
          source: string | null
          split: string | null
          tenant_risk_score: number | null
          vacancy_rate: number | null
        }
        Insert: {
          actual_bid_price?: number | null
          actual_bid_ratio: number
          appraised_value: number
          area_category?: string | null
          area_sqm?: number | null
          auction_case_id?: string | null
          avg_bid_ratio_region?: number | null
          avg_rent_per_sqm?: number | null
          building_age_years?: number | null
          collateral_type?: string | null
          created_at?: string | null
          delinquency_months?: number | null
          floor_no?: number | null
          id?: string
          legal_complexity?: number | null
          ltv?: number | null
          nbi_index?: number | null
          property_type: string
          quality_score?: number | null
          region: string
          risk_grade?: string | null
          senior_claims_ratio?: number | null
          source?: string | null
          split?: string | null
          tenant_risk_score?: number | null
          vacancy_rate?: number | null
        }
        Update: {
          actual_bid_price?: number | null
          actual_bid_ratio?: number
          appraised_value?: number
          area_category?: string | null
          area_sqm?: number | null
          auction_case_id?: string | null
          avg_bid_ratio_region?: number | null
          avg_rent_per_sqm?: number | null
          building_age_years?: number | null
          collateral_type?: string | null
          created_at?: string | null
          delinquency_months?: number | null
          floor_no?: number | null
          id?: string
          legal_complexity?: number | null
          ltv?: number | null
          nbi_index?: number | null
          property_type?: string
          quality_score?: number | null
          region?: string
          risk_grade?: string | null
          senior_claims_ratio?: number | null
          source?: string | null
          split?: string | null
          tenant_risk_score?: number | null
          vacancy_rate?: number | null
        }
        Relationships: []
      }
      nbi_snapshots: {
        Row: {
          avg_bid_ratio: number | null
          computed_at: string | null
          id: string
          median_bid_ratio: number | null
          mom_change: number | null
          nbi_value: number
          property_type: string
          region: string
          sample_count: number | null
          snapshot_date: string
          trend: string | null
          yoy_change: number | null
        }
        Insert: {
          avg_bid_ratio?: number | null
          computed_at?: string | null
          id?: string
          median_bid_ratio?: number | null
          mom_change?: number | null
          nbi_value: number
          property_type: string
          region: string
          sample_count?: number | null
          snapshot_date: string
          trend?: string | null
          yoy_change?: number | null
        }
        Update: {
          avg_bid_ratio?: number | null
          computed_at?: string | null
          id?: string
          median_bid_ratio?: number | null
          mom_change?: number | null
          nbi_value?: number
          property_type?: string
          region?: string
          sample_count?: number | null
          snapshot_date?: string
          trend?: string | null
          yoy_change?: number | null
        }
        Relationships: []
      }
      nda_agreements: {
        Row: {
          created_at: string | null
          deal_room_id: string | null
          document_hash: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          listing_id: string | null
          nda_template_url: string | null
          nda_version: string
          revoked_at: string | null
          signature_data: Json | null
          signed_at: string | null
          signed_document_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deal_room_id?: string | null
          document_hash?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          listing_id?: string | null
          nda_template_url?: string | null
          nda_version?: string
          revoked_at?: string | null
          signature_data?: Json | null
          signed_at?: string | null
          signed_document_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deal_room_id?: string | null
          document_hash?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          listing_id?: string | null
          nda_template_url?: string | null
          nda_version?: string
          revoked_at?: string | null
          signature_data?: Json | null
          signed_at?: string | null
          signed_document_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nda_agreements_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nda_agreements_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_ai_analyses: {
        Row: {
          bid_rate_stats: Json | null
          court_info: Json | null
          created_at: string | null
          grade: string
          id: string
          listing_id: string | null
          recommendation: string | null
          risk_factors: Json | null
          risk_score: number | null
          similar_cases: Json | null
          transaction_cases: Json | null
          user_id: string
        }
        Insert: {
          bid_rate_stats?: Json | null
          court_info?: Json | null
          created_at?: string | null
          grade: string
          id?: string
          listing_id?: string | null
          recommendation?: string | null
          risk_factors?: Json | null
          risk_score?: number | null
          similar_cases?: Json | null
          transaction_cases?: Json | null
          user_id: string
        }
        Update: {
          bid_rate_stats?: Json | null
          court_info?: Json | null
          created_at?: string | null
          grade?: string
          id?: string
          listing_id?: string | null
          recommendation?: string | null
          risk_factors?: Json | null
          risk_score?: number | null
          similar_cases?: Json | null
          transaction_cases?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "npl_ai_analyses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_auction_history: {
        Row: {
          auction_date: string | null
          bidder_count: number | null
          case_id: string | null
          created_at: string | null
          id: string
          minimum_price: number | null
          result: string | null
          round: number
          sale_price: number | null
        }
        Insert: {
          auction_date?: string | null
          bidder_count?: number | null
          case_id?: string | null
          created_at?: string | null
          id?: string
          minimum_price?: number | null
          result?: string | null
          round: number
          sale_price?: number | null
        }
        Update: {
          auction_date?: string | null
          bidder_count?: number | null
          case_id?: string | null
          created_at?: string | null
          id?: string
          minimum_price?: number | null
          result?: string | null
          round?: number
          sale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_auction_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "npl_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_case_assumptions: {
        Row: {
          acquisition_tax_rate: number | null
          annual_appreciation_rate: number | null
          auction_cost_rate: number | null
          bond_discount_rate_aggressive: number | null
          bond_discount_rate_base: number | null
          bond_discount_rate_conservative: number | null
          case_id: string | null
          contract_deposit_rate: number | null
          created_at: string | null
          distribution_date: string | null
          eviction_cost: number | null
          exit_cap_rate: number | null
          holding_period_years: number | null
          id: string
          investment_period_months: number | null
          opex_rate: number | null
          other_cost_rate: number | null
          overdue_interest_rate: number | null
          overdue_interest_start_date: string | null
          pbr_multiple: number | null
          pledge_loan_ltv: number | null
          pledge_loan_rate: number | null
          property_tax: number | null
          purchase_date: string | null
          rent_unit_price: number | null
          repair_cost: number | null
          settlement_date: string | null
          small_tenant_amount: number | null
          target_bond_id: string | null
          target_bond_rank: number | null
          transfer_cost_rate: number | null
          updated_at: string | null
          vacancy_rate: number | null
          vehicle_fee_rate: number | null
          wage_claim: number | null
        }
        Insert: {
          acquisition_tax_rate?: number | null
          annual_appreciation_rate?: number | null
          auction_cost_rate?: number | null
          bond_discount_rate_aggressive?: number | null
          bond_discount_rate_base?: number | null
          bond_discount_rate_conservative?: number | null
          case_id?: string | null
          contract_deposit_rate?: number | null
          created_at?: string | null
          distribution_date?: string | null
          eviction_cost?: number | null
          exit_cap_rate?: number | null
          holding_period_years?: number | null
          id?: string
          investment_period_months?: number | null
          opex_rate?: number | null
          other_cost_rate?: number | null
          overdue_interest_rate?: number | null
          overdue_interest_start_date?: string | null
          pbr_multiple?: number | null
          pledge_loan_ltv?: number | null
          pledge_loan_rate?: number | null
          property_tax?: number | null
          purchase_date?: string | null
          rent_unit_price?: number | null
          repair_cost?: number | null
          settlement_date?: string | null
          small_tenant_amount?: number | null
          target_bond_id?: string | null
          target_bond_rank?: number | null
          transfer_cost_rate?: number | null
          updated_at?: string | null
          vacancy_rate?: number | null
          vehicle_fee_rate?: number | null
          wage_claim?: number | null
        }
        Update: {
          acquisition_tax_rate?: number | null
          annual_appreciation_rate?: number | null
          auction_cost_rate?: number | null
          bond_discount_rate_aggressive?: number | null
          bond_discount_rate_base?: number | null
          bond_discount_rate_conservative?: number | null
          case_id?: string | null
          contract_deposit_rate?: number | null
          created_at?: string | null
          distribution_date?: string | null
          eviction_cost?: number | null
          exit_cap_rate?: number | null
          holding_period_years?: number | null
          id?: string
          investment_period_months?: number | null
          opex_rate?: number | null
          other_cost_rate?: number | null
          overdue_interest_rate?: number | null
          overdue_interest_start_date?: string | null
          pbr_multiple?: number | null
          pledge_loan_ltv?: number | null
          pledge_loan_rate?: number | null
          property_tax?: number | null
          purchase_date?: string | null
          rent_unit_price?: number | null
          repair_cost?: number | null
          settlement_date?: string | null
          small_tenant_amount?: number | null
          target_bond_id?: string | null
          target_bond_rank?: number | null
          transfer_cost_rate?: number | null
          updated_at?: string | null
          vacancy_rate?: number | null
          vehicle_fee_rate?: number | null
          wage_claim?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_case_assumptions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "npl_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_case_properties: {
        Row: {
          appraisal_value: number | null
          building_area: number | null
          building_name: string | null
          case_id: string | null
          created_at: string | null
          estimated_sale_price: number | null
          id: string
          land_area: number | null
          lot_number: string | null
          minimum_price: number | null
          property_no: number | null
          sale_rate_assumption: number | null
          senior_bond_amount: number | null
          unit_no: string | null
          usage_type: string | null
        }
        Insert: {
          appraisal_value?: number | null
          building_area?: number | null
          building_name?: string | null
          case_id?: string | null
          created_at?: string | null
          estimated_sale_price?: number | null
          id?: string
          land_area?: number | null
          lot_number?: string | null
          minimum_price?: number | null
          property_no?: number | null
          sale_rate_assumption?: number | null
          senior_bond_amount?: number | null
          unit_no?: string | null
          usage_type?: string | null
        }
        Update: {
          appraisal_value?: number | null
          building_area?: number | null
          building_name?: string | null
          case_id?: string | null
          created_at?: string | null
          estimated_sale_price?: number | null
          id?: string
          land_area?: number | null
          lot_number?: string | null
          minimum_price?: number | null
          property_no?: number | null
          sale_rate_assumption?: number | null
          senior_bond_amount?: number | null
          unit_no?: string | null
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_case_properties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "npl_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_case_rights: {
        Row: {
          case_id: string | null
          claim_amount: number | null
          classification: string
          created_at: string | null
          extinguish_yn: boolean | null
          id: string
          interest_rate: number | null
          interest_start_date: string | null
          is_cancellation_basis: boolean | null
          max_claim_amount: number | null
          notes: string | null
          principal: number | null
          priority_rank: number | null
          registration_date: string | null
          right_holder: string | null
          right_type: string
          seq: number
        }
        Insert: {
          case_id?: string | null
          claim_amount?: number | null
          classification: string
          created_at?: string | null
          extinguish_yn?: boolean | null
          id?: string
          interest_rate?: number | null
          interest_start_date?: string | null
          is_cancellation_basis?: boolean | null
          max_claim_amount?: number | null
          notes?: string | null
          principal?: number | null
          priority_rank?: number | null
          registration_date?: string | null
          right_holder?: string | null
          right_type: string
          seq: number
        }
        Update: {
          case_id?: string | null
          claim_amount?: number | null
          classification?: string
          created_at?: string | null
          extinguish_yn?: boolean | null
          id?: string
          interest_rate?: number | null
          interest_start_date?: string | null
          is_cancellation_basis?: boolean | null
          max_claim_amount?: number | null
          notes?: string | null
          principal?: number | null
          priority_rank?: number | null
          registration_date?: string | null
          right_holder?: string | null
          right_type?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "npl_case_rights_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "npl_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_case_tenants: {
        Row: {
          case_id: string | null
          created_at: string | null
          deposit: number | null
          fixed_date: string | null
          has_opposition_right: boolean | null
          id: string
          monthly_rent: number | null
          move_in_date: string | null
          notes: string | null
          priority_repayment: number | null
          risk_level: string | null
          tenant_name: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          deposit?: number | null
          fixed_date?: string | null
          has_opposition_right?: boolean | null
          id?: string
          monthly_rent?: number | null
          move_in_date?: string | null
          notes?: string | null
          priority_repayment?: number | null
          risk_level?: string | null
          tenant_name?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          deposit?: number | null
          fixed_date?: string | null
          has_opposition_right?: boolean | null
          id?: string
          monthly_rent?: number | null
          move_in_date?: string | null
          notes?: string | null
          priority_repayment?: number | null
          risk_level?: string | null
          tenant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_case_tenants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "npl_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_cases: {
        Row: {
          address: string | null
          ai_estimated_value: number | null
          appraisal_value: number | null
          auction_count: number | null
          building_area: number | null
          building_extra_area: number | null
          case_number: string
          case_type: string | null
          court_name: string | null
          created_at: string | null
          debtor_name: string | null
          detailed_address: string | null
          id: string
          land_area: number | null
          main_creditor: string | null
          minimum_price: number | null
          next_auction_date: string | null
          owner_name: string | null
          property_composition: string | null
          property_type: string | null
          regulation_zone: string | null
          status: string | null
          total_claim_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          ai_estimated_value?: number | null
          appraisal_value?: number | null
          auction_count?: number | null
          building_area?: number | null
          building_extra_area?: number | null
          case_number: string
          case_type?: string | null
          court_name?: string | null
          created_at?: string | null
          debtor_name?: string | null
          detailed_address?: string | null
          id?: string
          land_area?: number | null
          main_creditor?: string | null
          minimum_price?: number | null
          next_auction_date?: string | null
          owner_name?: string | null
          property_composition?: string | null
          property_type?: string | null
          regulation_zone?: string | null
          status?: string | null
          total_claim_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          ai_estimated_value?: number | null
          appraisal_value?: number | null
          auction_count?: number | null
          building_area?: number | null
          building_extra_area?: number | null
          case_number?: string
          case_type?: string | null
          court_name?: string | null
          created_at?: string | null
          debtor_name?: string | null
          detailed_address?: string | null
          id?: string
          land_area?: number | null
          main_creditor?: string | null
          minimum_price?: number | null
          next_auction_date?: string | null
          owner_name?: string | null
          property_composition?: string | null
          property_type?: string | null
          regulation_zone?: string | null
          status?: string | null
          total_claim_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      npl_distributions: {
        Row: {
          auction_cost: number | null
          case_id: string | null
          created_at: string | null
          distributable_amount: number | null
          distribution_detail: Json | null
          id: string
          owner_surplus: number | null
          property_tax: number | null
          recovery_rates: Json | null
          sale_price: number
          scenario_name: string
          small_tenant_priority: number | null
          wage_claim: number | null
        }
        Insert: {
          auction_cost?: number | null
          case_id?: string | null
          created_at?: string | null
          distributable_amount?: number | null
          distribution_detail?: Json | null
          id?: string
          owner_surplus?: number | null
          property_tax?: number | null
          recovery_rates?: Json | null
          sale_price: number
          scenario_name: string
          small_tenant_priority?: number | null
          wage_claim?: number | null
        }
        Update: {
          auction_cost?: number | null
          case_id?: string | null
          created_at?: string | null
          distributable_amount?: number | null
          distribution_detail?: Json | null
          id?: string
          owner_surplus?: number | null
          property_tax?: number | null
          recovery_rates?: Json | null
          sale_price?: number
          scenario_name?: string
          small_tenant_priority?: number | null
          wage_claim?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_distributions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "npl_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_listings: {
        Row: {
          address: string
          address_masked: string | null
          ai_estimated_price: number | null
          ai_grade: string | null
          appraised_value: number | null
          attachments: Json | null
          auction_case_number: string | null
          auction_count: number | null
          auction_court: string | null
          auction_date: string | null
          auction_round: number | null
          bid_count: number | null
          bid_deadline: string | null
          bid_end_date: string | null
          bid_rate_avg: number | null
          bid_start_date: string | null
          bid_status: string | null
          building_area: number | null
          claim_amount: number
          collateral_address: string | null
          collateral_type: Database["public"]["Enums"]["collateral_type"]
          court_avg_days: number | null
          court_name: string | null
          created_at: string | null
          creditor_institution: string | null
          debtor_status: Database["public"]["Enums"]["debtor_status"] | null
          debtor_type: string | null
          deposit_rate: number | null
          description: string | null
          disclosure_level:
            | Database["public"]["Enums"]["disclosure_level"]
            | null
          discount_rate: number | null
          documents_summary: string | null
          eupmyeondong: string | null
          exclusive_area: number | null
          expires_at: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          interest_count: number | null
          is_featured: boolean | null
          land_area: number | null
          latitude: number | null
          legal_issues: Json | null
          listing_type: string | null
          loan_balance: number | null
          loan_interest_rate: number | null
          loan_principal: number | null
          loan_start_date: string | null
          longitude: number | null
          ltv_ratio: number | null
          min_bid_price: number | null
          minimum_bid: number | null
          occupancy_status:
            | Database["public"]["Enums"]["occupancy_status"]
            | null
          ocr_data: Json | null
          original_file_name: string | null
          original_file_url: string | null
          proposed_sale_price: number | null
          seller_id: string
          setup_amount: number | null
          sido: string | null
          sigungu: string | null
          similar_case_count: number | null
          status: Database["public"]["Enums"]["listing_status"] | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          unpaid_interest: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          address: string
          address_masked?: string | null
          ai_estimated_price?: number | null
          ai_grade?: string | null
          appraised_value?: number | null
          attachments?: Json | null
          auction_case_number?: string | null
          auction_count?: number | null
          auction_court?: string | null
          auction_date?: string | null
          auction_round?: number | null
          bid_count?: number | null
          bid_deadline?: string | null
          bid_end_date?: string | null
          bid_rate_avg?: number | null
          bid_start_date?: string | null
          bid_status?: string | null
          building_area?: number | null
          claim_amount: number
          collateral_address?: string | null
          collateral_type: Database["public"]["Enums"]["collateral_type"]
          court_avg_days?: number | null
          court_name?: string | null
          created_at?: string | null
          creditor_institution?: string | null
          debtor_status?: Database["public"]["Enums"]["debtor_status"] | null
          debtor_type?: string | null
          deposit_rate?: number | null
          description?: string | null
          disclosure_level?:
            | Database["public"]["Enums"]["disclosure_level"]
            | null
          discount_rate?: number | null
          documents_summary?: string | null
          eupmyeondong?: string | null
          exclusive_area?: number | null
          expires_at?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          interest_count?: number | null
          is_featured?: boolean | null
          land_area?: number | null
          latitude?: number | null
          legal_issues?: Json | null
          listing_type?: string | null
          loan_balance?: number | null
          loan_interest_rate?: number | null
          loan_principal?: number | null
          loan_start_date?: string | null
          longitude?: number | null
          ltv_ratio?: number | null
          min_bid_price?: number | null
          minimum_bid?: number | null
          occupancy_status?:
            | Database["public"]["Enums"]["occupancy_status"]
            | null
          ocr_data?: Json | null
          original_file_name?: string | null
          original_file_url?: string | null
          proposed_sale_price?: number | null
          seller_id: string
          setup_amount?: number | null
          sido?: string | null
          sigungu?: string | null
          similar_case_count?: number | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          unpaid_interest?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          address?: string
          address_masked?: string | null
          ai_estimated_price?: number | null
          ai_grade?: string | null
          appraised_value?: number | null
          attachments?: Json | null
          auction_case_number?: string | null
          auction_count?: number | null
          auction_court?: string | null
          auction_date?: string | null
          auction_round?: number | null
          bid_count?: number | null
          bid_deadline?: string | null
          bid_end_date?: string | null
          bid_rate_avg?: number | null
          bid_start_date?: string | null
          bid_status?: string | null
          building_area?: number | null
          claim_amount?: number
          collateral_address?: string | null
          collateral_type?: Database["public"]["Enums"]["collateral_type"]
          court_avg_days?: number | null
          court_name?: string | null
          created_at?: string | null
          creditor_institution?: string | null
          debtor_status?: Database["public"]["Enums"]["debtor_status"] | null
          debtor_type?: string | null
          deposit_rate?: number | null
          description?: string | null
          disclosure_level?:
            | Database["public"]["Enums"]["disclosure_level"]
            | null
          discount_rate?: number | null
          documents_summary?: string | null
          eupmyeondong?: string | null
          exclusive_area?: number | null
          expires_at?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          interest_count?: number | null
          is_featured?: boolean | null
          land_area?: number | null
          latitude?: number | null
          legal_issues?: Json | null
          listing_type?: string | null
          loan_balance?: number | null
          loan_interest_rate?: number | null
          loan_principal?: number | null
          loan_start_date?: string | null
          longitude?: number | null
          ltv_ratio?: number | null
          min_bid_price?: number | null
          minimum_bid?: number | null
          occupancy_status?:
            | Database["public"]["Enums"]["occupancy_status"]
            | null
          ocr_data?: Json | null
          original_file_name?: string | null
          original_file_url?: string | null
          proposed_sale_price?: number | null
          seller_id?: string
          setup_amount?: number | null
          sido?: string | null
          sigungu?: string | null
          similar_case_count?: number | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          unpaid_interest?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_market_stats: {
        Row: {
          avg_appraisal: number | null
          avg_auction_count: number | null
          avg_sale_price: number | null
          avg_sale_rate: number | null
          created_at: string | null
          data_date: string | null
          id: string
          period: string | null
          property_type: string | null
          region: string | null
          total_cases: number | null
        }
        Insert: {
          avg_appraisal?: number | null
          avg_auction_count?: number | null
          avg_sale_price?: number | null
          avg_sale_rate?: number | null
          created_at?: string | null
          data_date?: string | null
          id?: string
          period?: string | null
          property_type?: string | null
          region?: string | null
          total_cases?: number | null
        }
        Update: {
          avg_appraisal?: number | null
          avg_auction_count?: number | null
          avg_sale_price?: number | null
          avg_sale_rate?: number | null
          created_at?: string | null
          data_date?: string | null
          id?: string
          period?: string | null
          property_type?: string | null
          region?: string | null
          total_cases?: number | null
        }
        Relationships: []
      }
      npl_returns: {
        Row: {
          absolute_return_rate: number | null
          annual_cashflows: Json | null
          annual_noi: number | null
          annualized_irr: number | null
          bond_purchase_price: number | null
          break_even_price: number | null
          break_even_rate: number | null
          case_id: string | null
          cash_yield: number | null
          created_at: string | null
          equity_amount: number | null
          exit_valuation: Json | null
          exit_value: number | null
          expected_return: number | null
          funding_structure: Json | null
          id: string
          investment_amount: number | null
          moic: number | null
          net_profit: number | null
          npv: number | null
          pledge_loan_amount: number | null
          scenario_name: string
          strategy_type: string
          total_acquisition_cost: number | null
        }
        Insert: {
          absolute_return_rate?: number | null
          annual_cashflows?: Json | null
          annual_noi?: number | null
          annualized_irr?: number | null
          bond_purchase_price?: number | null
          break_even_price?: number | null
          break_even_rate?: number | null
          case_id?: string | null
          cash_yield?: number | null
          created_at?: string | null
          equity_amount?: number | null
          exit_valuation?: Json | null
          exit_value?: number | null
          expected_return?: number | null
          funding_structure?: Json | null
          id?: string
          investment_amount?: number | null
          moic?: number | null
          net_profit?: number | null
          npv?: number | null
          pledge_loan_amount?: number | null
          scenario_name: string
          strategy_type: string
          total_acquisition_cost?: number | null
        }
        Update: {
          absolute_return_rate?: number | null
          annual_cashflows?: Json | null
          annual_noi?: number | null
          annualized_irr?: number | null
          bond_purchase_price?: number | null
          break_even_price?: number | null
          break_even_rate?: number | null
          case_id?: string | null
          cash_yield?: number | null
          created_at?: string | null
          equity_amount?: number | null
          exit_valuation?: Json | null
          exit_value?: number | null
          expected_return?: number | null
          funding_structure?: Json | null
          id?: string
          investment_amount?: number | null
          moic?: number | null
          net_profit?: number | null
          npv?: number | null
          pledge_loan_amount?: number | null
          scenario_name?: string
          strategy_type?: string
          total_acquisition_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_returns_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "npl_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_sensitivity: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string
          matrix_data: Json | null
          matrix_type: string
          x_axis_label: string | null
          x_values: Json | null
          y_axis_label: string | null
          y_values: Json | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string
          matrix_data?: Json | null
          matrix_type: string
          x_axis_label?: string | null
          x_values?: Json | null
          y_axis_label?: string | null
          y_values?: Json | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string
          matrix_data?: Json | null
          matrix_type?: string
          x_axis_label?: string | null
          x_values?: Json | null
          y_axis_label?: string | null
          y_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_sensitivity_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "npl_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      npl_view_logs: {
        Row: {
          id: string
          listing_id: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npl_view_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ont_atomic_capsule: {
        Row: {
          ai_model: string | null
          atomic_id: number
          capsule_id: number | null
          concept_id: number | null
          content_json: Json | null
          description: string | null
          difficulty: string | null
          estimated_min: number | null
          generated_at: string | null
          generation_stage: string | null
          mastery_criteria: Json | null
          order_in_concept: number
          quiz_json: Json | null
          sub_concept_id: number | null
          topic: string
          web_sources: Json | null
        }
        Insert: {
          ai_model?: string | null
          atomic_id?: number
          capsule_id?: number | null
          concept_id?: number | null
          content_json?: Json | null
          description?: string | null
          difficulty?: string | null
          estimated_min?: number | null
          generated_at?: string | null
          generation_stage?: string | null
          mastery_criteria?: Json | null
          order_in_concept?: number
          quiz_json?: Json | null
          sub_concept_id?: number | null
          topic: string
          web_sources?: Json | null
        }
        Update: {
          ai_model?: string | null
          atomic_id?: number
          capsule_id?: number | null
          concept_id?: number | null
          content_json?: Json | null
          description?: string | null
          difficulty?: string | null
          estimated_min?: number | null
          generated_at?: string | null
          generation_stage?: string | null
          mastery_criteria?: Json | null
          order_in_concept?: number
          quiz_json?: Json | null
          sub_concept_id?: number | null
          topic?: string
          web_sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ont_atomic_capsule_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: false
            referencedRelation: "ont_lecture_capsule"
            referencedColumns: ["capsule_id"]
          },
          {
            foreignKeyName: "ont_atomic_capsule_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
          {
            foreignKeyName: "ont_atomic_capsule_sub_concept_id_fkey"
            columns: ["sub_concept_id"]
            isOneToOne: false
            referencedRelation: "ont_sub_concept"
            referencedColumns: ["sub_concept_id"]
          },
        ]
      }
      ont_concept: {
        Row: {
          concept_id: number
          created_at: string | null
          description: string | null
          difficulty: number | null
          domain_id: number | null
          estimated_minutes: number | null
          keywords: string[] | null
          lecture_content: string | null
          lecture_title: string | null
          level: string | null
          name: string
          parent_concept_id: number | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          concept_id?: number
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          domain_id?: number | null
          estimated_minutes?: number | null
          keywords?: string[] | null
          lecture_content?: string | null
          lecture_title?: string | null
          level?: string | null
          name: string
          parent_concept_id?: number | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          concept_id?: number
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          domain_id?: number | null
          estimated_minutes?: number | null
          keywords?: string[] | null
          lecture_content?: string | null
          lecture_title?: string | null
          level?: string | null
          name?: string
          parent_concept_id?: number | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ont_concept_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "ont_domain"
            referencedColumns: ["domain_id"]
          },
          {
            foreignKeyName: "ont_concept_parent_concept_id_fkey"
            columns: ["parent_concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_concept_importance: {
        Row: {
          avg_relevance: number
          concept_id: number
          expert_count: number
          experts: Json
          id: number
          max_relevance: number
          rank_in_domain: number | null
          rank_overall: number | null
          total_relevance_sum: number
          updated_at: string | null
          video_count: number
        }
        Insert: {
          avg_relevance?: number
          concept_id: number
          expert_count?: number
          experts?: Json
          id?: number
          max_relevance?: number
          rank_in_domain?: number | null
          rank_overall?: number | null
          total_relevance_sum?: number
          updated_at?: string | null
          video_count?: number
        }
        Update: {
          avg_relevance?: number
          concept_id?: number
          expert_count?: number
          experts?: Json
          id?: number
          max_relevance?: number
          rank_in_domain?: number | null
          rank_overall?: number | null
          total_relevance_sum?: number
          updated_at?: string | null
          video_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ont_concept_importance_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: true
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_domain: {
        Row: {
          color: string | null
          description: string | null
          domain_id: number
          icon: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          description?: string | null
          domain_id?: number
          icon?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          description?: string | null
          domain_id?: number
          icon?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ont_ebook_cache: {
        Row: {
          ai_content: Json
          ai_cost_usd: number | null
          ai_model: string | null
          cache_id: number
          chapter_count: number | null
          concept_id: number | null
          created_at: string | null
          invalidated_at: string | null
          total_chars: number | null
        }
        Insert: {
          ai_content: Json
          ai_cost_usd?: number | null
          ai_model?: string | null
          cache_id?: number
          chapter_count?: number | null
          concept_id?: number | null
          created_at?: string | null
          invalidated_at?: string | null
          total_chars?: number | null
        }
        Update: {
          ai_content?: Json
          ai_cost_usd?: number | null
          ai_model?: string | null
          cache_id?: number
          chapter_count?: number | null
          concept_id?: number | null
          created_at?: string | null
          invalidated_at?: string | null
          total_chars?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ont_ebook_cache_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: true
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_learning_streak: {
        Row: {
          capsules_studied: number | null
          created_at: string | null
          minutes_studied: number | null
          quizzes_passed: number | null
          streak_id: number
          study_date: string
          user_id: string
        }
        Insert: {
          capsules_studied?: number | null
          created_at?: string | null
          minutes_studied?: number | null
          quizzes_passed?: number | null
          streak_id?: number
          study_date?: string
          user_id: string
        }
        Update: {
          capsules_studied?: number | null
          created_at?: string | null
          minutes_studied?: number | null
          quizzes_passed?: number | null
          streak_id?: number
          study_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ont_lecture_analysis: {
        Row: {
          analysis_id: number
          analyzed_at: string | null
          case_ratio: number | null
          case_references: Json
          cta_ratio: number | null
          expert_name: string | null
          hooking_ratio: number | null
          information_ratio: number | null
          lecture_type: string
          lecture_type_scores: Json
          structure: Json
          total_segments: number | null
          youtube_id: number
        }
        Insert: {
          analysis_id?: number
          analyzed_at?: string | null
          case_ratio?: number | null
          case_references?: Json
          cta_ratio?: number | null
          expert_name?: string | null
          hooking_ratio?: number | null
          information_ratio?: number | null
          lecture_type?: string
          lecture_type_scores?: Json
          structure?: Json
          total_segments?: number | null
          youtube_id: number
        }
        Update: {
          analysis_id?: number
          analyzed_at?: string | null
          case_ratio?: number | null
          case_references?: Json
          cta_ratio?: number | null
          expert_name?: string | null
          hooking_ratio?: number | null
          information_ratio?: number | null
          lecture_type?: string
          lecture_type_scores?: Json
          structure?: Json
          total_segments?: number | null
          youtube_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ont_lecture_analysis_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: true
            referencedRelation: "ont_youtube"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      ont_lecture_capsule: {
        Row: {
          capsule_id: number
          capsule_title: string
          case_study_refs: Json
          concept_id: number
          difficulty_score: number | null
          expert_sources: Json
          generated_at: string | null
          level: string
          overview: string
          prerequisite_concepts: Json | null
          recommended_duration: number
          syllabus: Json
          teaching_guidelines: string
          theory_points: Json
        }
        Insert: {
          capsule_id?: number
          capsule_title: string
          case_study_refs?: Json
          concept_id: number
          difficulty_score?: number | null
          expert_sources?: Json
          generated_at?: string | null
          level: string
          overview?: string
          prerequisite_concepts?: Json | null
          recommended_duration?: number
          syllabus?: Json
          teaching_guidelines?: string
          theory_points?: Json
        }
        Update: {
          capsule_id?: number
          capsule_title?: string
          case_study_refs?: Json
          concept_id?: number
          difficulty_score?: number | null
          expert_sources?: Json
          generated_at?: string | null
          level?: string
          overview?: string
          prerequisite_concepts?: Json | null
          recommended_duration?: number
          syllabus?: Json
          teaching_guidelines?: string
          theory_points?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ont_lecture_capsule_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_lecture_plan_history: {
        Row: {
          additional_instructions: string | null
          ai_cost_usd: number | null
          ai_model: string | null
          ai_result: Json
          capsule_id: number | null
          concept_id: number | null
          created_at: string | null
          created_by: string | null
          emphasis_types: Json | null
          lecture_level: string
          plan_id: number
          section_count: number | null
          selected_youtube_ids: Json | null
          status: string | null
          target_duration_min: number
          version: number | null
        }
        Insert: {
          additional_instructions?: string | null
          ai_cost_usd?: number | null
          ai_model?: string | null
          ai_result: Json
          capsule_id?: number | null
          concept_id?: number | null
          created_at?: string | null
          created_by?: string | null
          emphasis_types?: Json | null
          lecture_level: string
          plan_id?: number
          section_count?: number | null
          selected_youtube_ids?: Json | null
          status?: string | null
          target_duration_min: number
          version?: number | null
        }
        Update: {
          additional_instructions?: string | null
          ai_cost_usd?: number | null
          ai_model?: string | null
          ai_result?: Json
          capsule_id?: number | null
          concept_id?: number | null
          created_at?: string | null
          created_by?: string | null
          emphasis_types?: Json | null
          lecture_level?: string
          plan_id?: number
          section_count?: number | null
          selected_youtube_ids?: Json | null
          status?: string | null
          target_duration_min?: number
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ont_lecture_plan_history_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: false
            referencedRelation: "ont_lecture_capsule"
            referencedColumns: ["capsule_id"]
          },
          {
            foreignKeyName: "ont_lecture_plan_history_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_newsletter_history: {
        Row: {
          ai_content: Json
          ai_cost_usd: number | null
          ai_model: string | null
          capsule_id: number | null
          concept_id: number | null
          error_message: string | null
          newsletter_id: number
          newsletter_type: string
          ontology_context: Json | null
          recipient_count: number | null
          sent_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          ai_content: Json
          ai_cost_usd?: number | null
          ai_model?: string | null
          capsule_id?: number | null
          concept_id?: number | null
          error_message?: string | null
          newsletter_id?: number
          newsletter_type: string
          ontology_context?: Json | null
          recipient_count?: number | null
          sent_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          ai_content?: Json
          ai_cost_usd?: number | null
          ai_model?: string | null
          capsule_id?: number | null
          concept_id?: number | null
          error_message?: string | null
          newsletter_id?: number
          newsletter_type?: string
          ontology_context?: Json | null
          recipient_count?: number | null
          sent_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ont_newsletter_history_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: false
            referencedRelation: "ont_lecture_capsule"
            referencedColumns: ["capsule_id"]
          },
          {
            foreignKeyName: "ont_newsletter_history_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_path: {
        Row: {
          description: string | null
          domain_id: number | null
          estimated_hours: number | null
          level: string | null
          name: string
          path_id: number
          prerequisites: string[] | null
          sort_order: number | null
          target_audience: string | null
        }
        Insert: {
          description?: string | null
          domain_id?: number | null
          estimated_hours?: number | null
          level?: string | null
          name: string
          path_id?: number
          prerequisites?: string[] | null
          sort_order?: number | null
          target_audience?: string | null
        }
        Update: {
          description?: string | null
          domain_id?: number | null
          estimated_hours?: number | null
          level?: string | null
          name?: string
          path_id?: number
          prerequisites?: string[] | null
          sort_order?: number | null
          target_audience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ont_path_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "ont_domain"
            referencedColumns: ["domain_id"]
          },
        ]
      }
      ont_path_step: {
        Row: {
          concept_id: number | null
          description: string | null
          is_optional: boolean | null
          path_id: number | null
          step_id: number
          step_order: number
        }
        Insert: {
          concept_id?: number | null
          description?: string | null
          is_optional?: boolean | null
          path_id?: number | null
          step_id?: number
          step_order: number
        }
        Update: {
          concept_id?: number | null
          description?: string | null
          is_optional?: boolean | null
          path_id?: number | null
          step_id?: number
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ont_path_step_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
          {
            foreignKeyName: "ont_path_step_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "ont_path"
            referencedColumns: ["path_id"]
          },
        ]
      }
      ont_relation: {
        Row: {
          description: string | null
          relation_id: number
          relation_type: string
          source_concept_id: number | null
          target_concept_id: number | null
          weight: number | null
        }
        Insert: {
          description?: string | null
          relation_id?: number
          relation_type: string
          source_concept_id?: number | null
          target_concept_id?: number | null
          weight?: number | null
        }
        Update: {
          description?: string | null
          relation_id?: number
          relation_type?: string
          source_concept_id?: number | null
          target_concept_id?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ont_relation_source_concept_id_fkey"
            columns: ["source_concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
          {
            foreignKeyName: "ont_relation_target_concept_id_fkey"
            columns: ["target_concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_sub_concept: {
        Row: {
          concept_id: number
          content: Json | null
          created_at: string | null
          description: string | null
          difficulty: number | null
          estimated_minutes: number | null
          keywords: string[] | null
          name: string
          order_in_parent: number | null
          source_video_count: number | null
          sub_concept_id: number
          updated_at: string | null
        }
        Insert: {
          concept_id: number
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          estimated_minutes?: number | null
          keywords?: string[] | null
          name: string
          order_in_parent?: number | null
          source_video_count?: number | null
          sub_concept_id?: number
          updated_at?: string | null
        }
        Update: {
          concept_id?: number
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          estimated_minutes?: number | null
          keywords?: string[] | null
          name?: string
          order_in_parent?: number | null
          source_video_count?: number | null
          sub_concept_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ont_sub_concept_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_sub_concept_video: {
        Row: {
          created_at: string | null
          id: number
          relevance: number | null
          sub_concept_id: number
          transcript_segment: string | null
          youtube_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          relevance?: number | null
          sub_concept_id: number
          transcript_segment?: string | null
          youtube_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          relevance?: number | null
          sub_concept_id?: number
          transcript_segment?: string | null
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ont_sub_concept_video_sub_concept_id_fkey"
            columns: ["sub_concept_id"]
            isOneToOne: false
            referencedRelation: "ont_sub_concept"
            referencedColumns: ["sub_concept_id"]
          },
        ]
      }
      ont_user_badge: {
        Row: {
          badge_icon: string | null
          badge_id: number
          badge_name: string
          badge_type: string
          earned_at: string | null
          user_id: string
        }
        Insert: {
          badge_icon?: string | null
          badge_id?: number
          badge_name: string
          badge_type: string
          earned_at?: string | null
          user_id: string
        }
        Update: {
          badge_icon?: string | null
          badge_id?: number
          badge_name?: string
          badge_type?: string
          earned_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ont_user_progress: {
        Row: {
          atomic_id: number | null
          concept_id: number | null
          last_studied: string | null
          mastered_at: string | null
          notes: string | null
          progress_id: number
          quiz_score: number | null
          status: string | null
          study_count: number | null
          user_id: string
        }
        Insert: {
          atomic_id?: number | null
          concept_id?: number | null
          last_studied?: string | null
          mastered_at?: string | null
          notes?: string | null
          progress_id?: number
          quiz_score?: number | null
          status?: string | null
          study_count?: number | null
          user_id?: string
        }
        Update: {
          atomic_id?: number | null
          concept_id?: number | null
          last_studied?: string | null
          mastered_at?: string | null
          notes?: string | null
          progress_id?: number
          quiz_score?: number | null
          status?: string | null
          study_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ont_user_progress_atomic_id_fkey"
            columns: ["atomic_id"]
            isOneToOne: false
            referencedRelation: "ont_atomic_capsule"
            referencedColumns: ["atomic_id"]
          },
          {
            foreignKeyName: "ont_user_progress_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      ont_youtube: {
        Row: {
          case_references: Json | null
          channel_name: string | null
          created_at: string | null
          duration_seconds: number | null
          expert_name: string | null
          lecture_type: string | null
          published_at: string | null
          structure_segments: Json | null
          title: string | null
          transcript: string | null
          video_id: string | null
          view_count: number | null
          youtube_id: number
        }
        Insert: {
          case_references?: Json | null
          channel_name?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          expert_name?: string | null
          lecture_type?: string | null
          published_at?: string | null
          structure_segments?: Json | null
          title?: string | null
          transcript?: string | null
          video_id?: string | null
          view_count?: number | null
          youtube_id?: number
        }
        Update: {
          case_references?: Json | null
          channel_name?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          expert_name?: string | null
          lecture_type?: string | null
          published_at?: string | null
          structure_segments?: Json | null
          title?: string | null
          transcript?: string | null
          video_id?: string | null
          view_count?: number | null
          youtube_id?: number
        }
        Relationships: []
      }
      ont_youtube_concept: {
        Row: {
          concept_id: number | null
          id: number
          relevance: number | null
          timestamp_end: number | null
          timestamp_start: number | null
          youtube_id: number | null
        }
        Insert: {
          concept_id?: number | null
          id?: number
          relevance?: number | null
          timestamp_end?: number | null
          timestamp_start?: number | null
          youtube_id?: number | null
        }
        Update: {
          concept_id?: number | null
          id?: number
          relevance?: number | null
          timestamp_end?: number | null
          timestamp_start?: number | null
          youtube_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ont_youtube_concept_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "ont_concept"
            referencedColumns: ["concept_id"]
          },
          {
            foreignKeyName: "ont_youtube_concept_youtube_id_fkey"
            columns: ["youtube_id"]
            isOneToOne: false
            referencedRelation: "ont_youtube"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      partner_profiles: {
        Row: {
          biz_number: string | null
          ceo_name: string | null
          company_name: string
          created_at: string | null
          expertise: Json | null
          id: string
          partner_type: string
          phone: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          biz_number?: string | null
          ceo_name?: string | null
          company_name: string
          created_at?: string | null
          expertise?: Json | null
          id?: string
          partner_type: string
          phone?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          biz_number?: string | null
          ceo_name?: string | null
          company_name?: string
          created_at?: string | null
          expertise?: Json | null
          id?: string
          partner_type?: string
          phone?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          cancel_reason: string | null
          cancelled_amount: number | null
          cancelled_at: string | null
          created_at: string | null
          credits_granted: number | null
          currency: string
          id: string
          metadata: Json | null
          order_id: string
          payment_id: string
          pg_provider: string | null
          product_id: string | null
          product_type: string
          receipt_url: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cancel_reason?: string | null
          cancelled_amount?: number | null
          cancelled_at?: string | null
          created_at?: string | null
          credits_granted?: number | null
          currency?: string
          id?: string
          metadata?: Json | null
          order_id: string
          payment_id: string
          pg_provider?: string | null
          product_id?: string | null
          product_type: string
          receipt_url?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cancel_reason?: string | null
          cancelled_amount?: number | null
          cancelled_at?: string | null
          created_at?: string | null
          credits_granted?: number | null
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_id?: string
          pg_provider?: string | null
          product_id?: string | null
          product_type?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_ref_id: string | null
          order_type: Database["public"]["Enums"]["payment_order_type"]
          paid_at: string | null
          partner_settlement: number | null
          pg_provider: string | null
          pg_transaction_id: string | null
          platform_fee: number | null
          status: Database["public"]["Enums"]["payment_status"] | null
          tax_invoice_issued: boolean | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_ref_id?: string | null
          order_type: Database["public"]["Enums"]["payment_order_type"]
          paid_at?: string | null
          partner_settlement?: number | null
          pg_provider?: string | null
          pg_transaction_id?: string | null
          platform_fee?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tax_invoice_issued?: boolean | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_ref_id?: string | null
          order_type?: Database["public"]["Enums"]["payment_order_type"]
          paid_at?: string | null
          partner_settlement?: number | null
          pg_provider?: string | null
          pg_transaction_id?: string | null
          platform_fee?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tax_invoice_issued?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          auctions_fetched: number | null
          completed_at: string | null
          duration_ms: number | null
          error_log: Json | null
          error_messages: string[] | null
          finished_at: string | null
          id: string
          metadata: Json | null
          mode: string | null
          nbi_periods_computed: number | null
          pipeline_name: string
          records_failed: number | null
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string | null
          steps_failed: number | null
          steps_success: number | null
          steps_total: number | null
          transactions_fetched: number | null
          triggered_by: string | null
        }
        Insert: {
          auctions_fetched?: number | null
          completed_at?: string | null
          duration_ms?: number | null
          error_log?: Json | null
          error_messages?: string[] | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          mode?: string | null
          nbi_periods_computed?: number | null
          pipeline_name: string
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string | null
          steps_failed?: number | null
          steps_success?: number | null
          steps_total?: number | null
          transactions_fetched?: number | null
          triggered_by?: string | null
        }
        Update: {
          auctions_fetched?: number | null
          completed_at?: string | null
          duration_ms?: number | null
          error_log?: Json | null
          error_messages?: string[] | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          mode?: string | null
          nbi_periods_computed?: number | null
          pipeline_name?: string
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string | null
          steps_failed?: number | null
          steps_success?: number | null
          steps_total?: number | null
          transactions_fetched?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      professionals: {
        Row: {
          availability: string | null
          cases_count: number | null
          created_at: string | null
          description: string | null
          experience_years: number | null
          id: string
          is_verified: boolean | null
          license_number: string | null
          location: string | null
          name: string
          price_max: number | null
          price_min: number | null
          rating: number | null
          review_count: number | null
          specialty: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability?: string | null
          cases_count?: number | null
          created_at?: string | null
          description?: string | null
          experience_years?: number | null
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          location?: string | null
          name: string
          price_max?: number | null
          price_min?: number | null
          rating?: number | null
          review_count?: number | null
          specialty: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability?: string | null
          cases_count?: number | null
          created_at?: string | null
          description?: string | null
          experience_years?: number | null
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          location?: string | null
          name?: string
          price_max?: number | null
          price_min?: number | null
          rating?: number | null
          review_count?: number | null
          specialty?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      real_transactions: {
        Row: {
          apt_name: string | null
          area_sqm: number | null
          build_year: number | null
          created_at: string | null
          deal_amount: number
          deal_day: number | null
          deal_month: number
          deal_year: number
          district: string | null
          dong: string | null
          fetched_at: string | null
          floor_no: number | null
          id: string
          lawd_code: string
          price_per_pyeong: number | null
          price_per_sqm: number | null
          property_type: string
          region: string
          road_name: string | null
          source: string | null
        }
        Insert: {
          apt_name?: string | null
          area_sqm?: number | null
          build_year?: number | null
          created_at?: string | null
          deal_amount: number
          deal_day?: number | null
          deal_month: number
          deal_year: number
          district?: string | null
          dong?: string | null
          fetched_at?: string | null
          floor_no?: number | null
          id?: string
          lawd_code: string
          price_per_pyeong?: number | null
          price_per_sqm?: number | null
          property_type: string
          region: string
          road_name?: string | null
          source?: string | null
        }
        Update: {
          apt_name?: string | null
          area_sqm?: number | null
          build_year?: number | null
          created_at?: string | null
          deal_amount?: number
          deal_day?: number | null
          deal_month?: number
          deal_year?: number
          district?: string | null
          dong?: string | null
          fetched_at?: string | null
          floor_no?: number | null
          id?: string
          lawd_code?: string
          price_per_pyeong?: number | null
          price_per_sqm?: number | null
          property_type?: string
          region?: string
          road_name?: string | null
          source?: string | null
        }
        Relationships: []
      }
      rent_reference: {
        Row: {
          avg_rent_per_sqm: number
          created_at: string | null
          created_by: string | null
          district: string | null
          floor_category: string | null
          id: string
          is_active: boolean | null
          median_rent_per_sqm: number | null
          p25_rent: number | null
          p75_rent: number | null
          property_type: string
          reference_period: string | null
          region: string
          sample_count: number | null
          source: string | null
          updated_at: string | null
          vacancy_rate: number | null
        }
        Insert: {
          avg_rent_per_sqm: number
          created_at?: string | null
          created_by?: string | null
          district?: string | null
          floor_category?: string | null
          id?: string
          is_active?: boolean | null
          median_rent_per_sqm?: number | null
          p25_rent?: number | null
          p75_rent?: number | null
          property_type: string
          reference_period?: string | null
          region: string
          sample_count?: number | null
          source?: string | null
          updated_at?: string | null
          vacancy_rate?: number | null
        }
        Update: {
          avg_rent_per_sqm?: number
          created_at?: string | null
          created_by?: string | null
          district?: string | null
          floor_category?: string | null
          id?: string
          is_active?: boolean | null
          median_rent_per_sqm?: number | null
          p25_rent?: number | null
          p75_rent?: number | null
          property_type?: string
          reference_period?: string | null
          region?: string
          sample_count?: number | null
          source?: string | null
          updated_at?: string | null
          vacancy_rate?: number | null
        }
        Relationships: []
      }
      role_requests: {
        Row: {
          business_number: string | null
          company_name: string | null
          created_at: string | null
          documents: Json | null
          existing_role: string
          id: string
          reason: string | null
          rejection_reason: string | null
          representative_name: string | null
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_number?: string | null
          company_name?: string | null
          created_at?: string | null
          documents?: Json | null
          existing_role: string
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          representative_name?: string | null
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_number?: string | null
          company_name?: string | null
          created_at?: string | null
          documents?: Json | null
          existing_role?: string
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          representative_name?: string | null
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          clicked_listing_id: string | null
          created_at: string | null
          filters: Json | null
          id: string
          query_text: string | null
          result_count: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          clicked_listing_id?: string | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          query_text?: string | null
          result_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_listing_id?: string | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          query_text?: string | null
          result_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_clicked_listing_id_fkey"
            columns: ["clicked_listing_id"]
            isOneToOne: false
            referencedRelation: "npl_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          ai_credits_monthly_limit: number
          ai_credits_remaining: number
          created_at: string | null
          expires_at: string | null
          id: string
          plan: string
          started_at: string | null
          status: string
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_credits_monthly_limit?: number
          ai_credits_remaining?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_credits_monthly_limit?: number
          ai_credits_remaining?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_prices: {
        Row: {
          apartment_name: string | null
          build_year: number | null
          created_at: string | null
          deal_amount: number | null
          deal_date: string | null
          dong: string | null
          exclusive_area: number | null
          floor: number | null
          id: string
          jibun: string | null
          property_type: string | null
          raw_data: Json | null
          sido: string | null
          sigungu: string | null
          source: string | null
        }
        Insert: {
          apartment_name?: string | null
          build_year?: number | null
          created_at?: string | null
          deal_amount?: number | null
          deal_date?: string | null
          dong?: string | null
          exclusive_area?: number | null
          floor?: number | null
          id?: string
          jibun?: string | null
          property_type?: string | null
          raw_data?: Json | null
          sido?: string | null
          sigungu?: string | null
          source?: string | null
        }
        Update: {
          apartment_name?: string | null
          build_year?: number | null
          created_at?: string | null
          deal_amount?: number | null
          deal_date?: string | null
          dong?: string | null
          exclusive_area?: number | null
          floor?: number | null
          id?: string
          jibun?: string | null
          property_type?: string | null
          raw_data?: Json | null
          sido?: string | null
          sigungu?: string | null
          source?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          credit_balance: number
          credits_used_total: number
          deleted_at: string | null
          email: string
          failed_login_count: number | null
          id: string
          is_verified: boolean | null
          kyc_status: Database["public"]["Enums"]["kyc_status"] | null
          last_login_at: string | null
          last_login_ip: unknown
          locked_until: string | null
          login_count: number | null
          mfa_enabled: boolean | null
          name: string
          nda_signed: boolean | null
          partner_score: number | null
          phone: string | null
          phone_verified: boolean | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"]
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          credit_balance?: number
          credits_used_total?: number
          deleted_at?: string | null
          email: string
          failed_login_count?: number | null
          id: string
          is_verified?: boolean | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          last_login_at?: string | null
          last_login_ip?: unknown
          locked_until?: string | null
          login_count?: number | null
          mfa_enabled?: boolean | null
          name: string
          nda_signed?: boolean | null
          partner_score?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          credit_balance?: number
          credits_used_total?: number
          deleted_at?: string | null
          email?: string
          failed_login_count?: number | null
          id?: string
          is_verified?: boolean | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          last_login_at?: string | null
          last_login_ip?: unknown
          locked_until?: string | null
          login_count?: number | null
          mfa_enabled?: boolean | null
          name?: string
          nda_signed?: boolean | null
          partner_score?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          endpoint_url: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          endpoint_url: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          endpoint_url?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_latest_nbi: {
        Row: {
          avg_bid_ratio: number | null
          computed_at: string | null
          median_bid_ratio: number | null
          mom_change: number | null
          nbi_value: number | null
          property_type: string | null
          region: string | null
          sample_count: number | null
          snapshot_date: string | null
          trend: string | null
          yoy_change: number | null
        }
        Relationships: []
      }
      v_monthly_auction_stats: {
        Row: {
          auction_month: string | null
          avg_attempts: number | null
          avg_bid_ratio: number | null
          avg_bidders: number | null
          median_bid_ratio: number | null
          property_type: string | null
          region: string | null
          success_rate_pct: number | null
          total_count: number | null
          won_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_match_score: {
        Args: { p_listing_id: string; p_survey_id: string }
        Returns: number
      }
      decrement_interest_count: {
        Args: { listing_id: string }
        Returns: undefined
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      increment_credit_balance: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: number
      }
      increment_interest_count: {
        Args: { listing_id: string }
        Returns: undefined
      }
      increment_view_count: { Args: { listing_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      mask_address: { Args: { p_address: string }; Returns: string }
      run_matching_for_listing: {
        Args: { p_listing_id: string }
        Returns: number
      }
      run_matching_for_survey: {
        Args: { p_survey_id: string }
        Returns: number
      }
    }
    Enums: {
      access_level: "BASIC" | "STANDARD" | "FULL"
      collateral_type:
        | "APARTMENT"
        | "COMMERCIAL"
        | "LAND"
        | "FACTORY"
        | "OFFICE"
        | "VILLA"
        | "OTHER"
      deal_room_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "CLOSING"
        | "CLOSED"
        | "CANCELLED"
      debtor_status: "PERFORMING" | "DEFAULTED" | "BANKRUPT"
      disclosure_level: "TEASER" | "NDA" | "FULL"
      investment_experience: "NONE" | "BEGINNER" | "INTERMEDIATE" | "EXPERT"
      kyc_status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED"
      listing_status: "DRAFT" | "ACTIVE" | "IN_DEAL" | "SOLD" | "WITHDRAWN"
      match_status:
        | "SUGGESTED"
        | "VIEWED"
        | "INTERESTED"
        | "REJECTED"
        | "CONVERTED"
      notification_type:
        | "MATCH"
        | "DEAL_UPDATE"
        | "PAYMENT"
        | "SYSTEM"
        | "NDA_REQUEST"
      occupancy_status: "VACANT" | "OCCUPIED" | "UNKNOWN"
      participant_role: "SELLER" | "BUYER" | "PARTNER" | "OBSERVER"
      payment_order_type:
        | "SUBSCRIPTION"
        | "DEAL_ROOM"
        | "PRODUCT"
        | "REPORT"
        | "MARKETING"
      payment_status:
        | "PENDING"
        | "COMPLETED"
        | "FAILED"
        | "REFUNDED"
        | "CANCELLED"
      subscription_tier: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE"
      survey_status: "DRAFT" | "ACTIVE" | "MATCHED" | "EXPIRED" | "CANCELLED"
      urgency_level: "URGENT" | "NORMAL" | "FLEXIBLE"
      user_role:
        | "SUPER_ADMIN"
        | "ADMIN"
        | "SELLER"
        | "BUYER_INST"
        | "BUYER_INDV"
        | "PARTNER"
        | "VIEWER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level: ["BASIC", "STANDARD", "FULL"],
      collateral_type: [
        "APARTMENT",
        "COMMERCIAL",
        "LAND",
        "FACTORY",
        "OFFICE",
        "VILLA",
        "OTHER",
      ],
      deal_room_status: [
        "OPEN",
        "IN_PROGRESS",
        "CLOSING",
        "CLOSED",
        "CANCELLED",
      ],
      debtor_status: ["PERFORMING", "DEFAULTED", "BANKRUPT"],
      disclosure_level: ["TEASER", "NDA", "FULL"],
      investment_experience: ["NONE", "BEGINNER", "INTERMEDIATE", "EXPERT"],
      kyc_status: ["PENDING", "SUBMITTED", "APPROVED", "REJECTED"],
      listing_status: ["DRAFT", "ACTIVE", "IN_DEAL", "SOLD", "WITHDRAWN"],
      match_status: [
        "SUGGESTED",
        "VIEWED",
        "INTERESTED",
        "REJECTED",
        "CONVERTED",
      ],
      notification_type: [
        "MATCH",
        "DEAL_UPDATE",
        "PAYMENT",
        "SYSTEM",
        "NDA_REQUEST",
      ],
      occupancy_status: ["VACANT", "OCCUPIED", "UNKNOWN"],
      participant_role: ["SELLER", "BUYER", "PARTNER", "OBSERVER"],
      payment_order_type: [
        "SUBSCRIPTION",
        "DEAL_ROOM",
        "PRODUCT",
        "REPORT",
        "MARKETING",
      ],
      payment_status: [
        "PENDING",
        "COMPLETED",
        "FAILED",
        "REFUNDED",
        "CANCELLED",
      ],
      subscription_tier: ["FREE", "BASIC", "PREMIUM", "ENTERPRISE"],
      survey_status: ["DRAFT", "ACTIVE", "MATCHED", "EXPIRED", "CANCELLED"],
      urgency_level: ["URGENT", "NORMAL", "FLEXIBLE"],
      user_role: [
        "SUPER_ADMIN",
        "ADMIN",
        "SELLER",
        "BUYER_INST",
        "BUYER_INDV",
        "PARTNER",
        "VIEWER",
      ],
    },
  },
} as const
