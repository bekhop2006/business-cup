
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "disputes": {
                  Row: {
                    "call_script": string | null,"created_at": string,"id": string,"letter_text": string | null,"next_action_at": string | null,"status": Database["public"]['Enums']["dispute_status"],"user_id": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "call_script"?: string | null,"created_at"?: string,"id"?: string,"letter_text"?: string | null,"next_action_at"?: string | null,"status"?: Database["public"]['Enums']["dispute_status"],"user_id"?: string,"visit_id": string
                  }
                  Update: {
                    "call_script"?: string | null,"created_at"?: string,"id"?: string,"letter_text"?: string | null,"next_action_at"?: string | null,"status"?: Database["public"]['Enums']["dispute_status"],"user_id"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "disputes_visit_id_user_id_fkey"
      columns: ["visit_id","user_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "created_at": string,"extracted": Json | null,"file_name": string,"id": string,"insurance_paid_cents": number | null,"mime_type": string,"patient_name": string | null,"patient_responsibility_cents": number | null,"provider_name": string | null,"service_date": string | null,"source": Database["public"]['Enums']["document_source"],"stated_total_cents": number | null,"status": Database["public"]['Enums']["document_status"],"storage_path": string,"type": Database["public"]['Enums']["document_type"] | null,"user_id": string,"visit_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"extracted"?: Json | null,"file_name": string,"id"?: string,"insurance_paid_cents"?: number | null,"mime_type": string,"patient_name"?: string | null,"patient_responsibility_cents"?: number | null,"provider_name"?: string | null,"service_date"?: string | null,"source"?: Database["public"]['Enums']["document_source"],"stated_total_cents"?: number | null,"status"?: Database["public"]['Enums']["document_status"],"storage_path": string,"type"?: Database["public"]['Enums']["document_type"] | null,"user_id"?: string,"visit_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"extracted"?: Json | null,"file_name"?: string,"id"?: string,"insurance_paid_cents"?: number | null,"mime_type"?: string,"patient_name"?: string | null,"patient_responsibility_cents"?: number | null,"provider_name"?: string | null,"service_date"?: string | null,"source"?: Database["public"]['Enums']["document_source"],"stated_total_cents"?: number | null,"status"?: Database["public"]['Enums']["document_status"],"storage_path"?: string,"type"?: Database["public"]['Enums']["document_type"] | null,"user_id"?: string,"visit_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_visit_id_user_id_fkey"
      columns: ["visit_id","user_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"family_members": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"relation": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"relation"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"relation"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"flags": {
                  Row: {
                    "created_at": string,"document_id": string | null,"id": string,"line_item_id": string | null,"message": string,"potential_savings_cents": number,"type": Database["public"]['Enums']["flag_type"],"user_id": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_id"?: string | null,"id"?: string,"line_item_id"?: string | null,"message": string,"potential_savings_cents"?: number,"type": Database["public"]['Enums']["flag_type"],"user_id"?: string,"visit_id": string
                  }
                  Update: {
                    "created_at"?: string,"document_id"?: string | null,"id"?: string,"line_item_id"?: string | null,"message"?: string,"potential_savings_cents"?: number,"type"?: Database["public"]['Enums']["flag_type"],"user_id"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "flags_document_id_user_id_fkey"
      columns: ["document_id","user_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "flags_line_item_id_user_id_fkey"
      columns: ["line_item_id","user_id"]
isOneToOne: false
      referencedRelation: "line_items"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "flags_visit_id_user_id_fkey"
      columns: ["visit_id","user_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"insurance_plans": {
                  Row: {
                    "created_at": string,"deductible_cents": number,"id": string,"oop_max_cents": number,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deductible_cents": number,"id"?: string,"oop_max_cents": number,"user_id"?: string,"year": number
                  }
                  Update: {
                    "created_at"?: string,"deductible_cents"?: number,"id"?: string,"oop_max_cents"?: number,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"line_items": {
                  Row: {
                    "amount_cents": number,"code": string | null,"created_at": string,"description": string | null,"document_id": string,"id": string,"plain_explanation": string | null,"position": number,"quantity": number | null,"service_date": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"code"?: string | null,"created_at"?: string,"description"?: string | null,"document_id": string,"id"?: string,"plain_explanation"?: string | null,"position"?: number,"quantity"?: number | null,"service_date"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"code"?: string | null,"created_at"?: string,"description"?: string | null,"document_id"?: string,"id"?: string,"plain_explanation"?: string | null,"position"?: number,"quantity"?: number | null,"service_date"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "line_items_document_id_user_id_fkey"
      columns: ["document_id","user_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"inbound_alias": string,"plan": Database["public"]['Enums']["subscription_plan"],"stripe_customer_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"inbound_alias": string,"plan"?: Database["public"]['Enums']["subscription_plan"],"stripe_customer_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"inbound_alias"?: string,"plan"?: Database["public"]['Enums']["subscription_plan"],"stripe_customer_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"visits": {
                  Row: {
                    "billed_cents": number,"created_at": string,"family_member_id": string | null,"id": string,"insurance_paid_cents": number,"patient_owes_cents": number,"provider_name": string,"service_date": string,"status": Database["public"]['Enums']["visit_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billed_cents"?: number,"created_at"?: string,"family_member_id"?: string | null,"id"?: string,"insurance_paid_cents"?: number,"patient_owes_cents"?: number,"provider_name": string,"service_date": string,"status"?: Database["public"]['Enums']["visit_status"],"user_id"?: string
                  }
                  Update: {
                    "billed_cents"?: number,"created_at"?: string,"family_member_id"?: string | null,"id"?: string,"insurance_paid_cents"?: number,"patient_owes_cents"?: number,"provider_name"?: string,"service_date"?: string,"status"?: Database["public"]['Enums']["visit_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visits_family_member_id_user_id_fkey"
      columns: ["family_member_id","user_id"]
isOneToOne: false
      referencedRelation: "family_members"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "dispute_status": "draft"|"sent"|"waiting"|"resolved","document_source": "upload"|"email","document_status": "uploaded"|"processing"|"parsed"|"needs_review"|"failed","document_type": "bill"|"eob"|"receipt"|"other","flag_type": "duplicate_line"|"eob_mismatch"|"billed_before_insurance"|"unclear_line"|"total_mismatch","subscription_plan": "free"|"paid","visit_status": "waiting_for_insurance"|"to_pay"|"disputing"|"closed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "dispute_status": ["draft", "sent", "waiting", "resolved"],"document_source": ["upload", "email"],"document_status": ["uploaded", "processing", "parsed", "needs_review", "failed"],"document_type": ["bill", "eob", "receipt", "other"],"flag_type": ["duplicate_line", "eob_mismatch", "billed_before_insurance", "unclear_line", "total_mismatch"],"subscription_plan": ["free", "paid"],"visit_status": ["waiting_for_insurance", "to_pay", "disputing", "closed"]
          }
        }
} as const
