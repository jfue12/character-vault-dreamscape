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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      age_verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          user_id: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "age_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_characters: {
        Row: {
          character_id: string
          created_at: string
          id: string
          is_active: boolean | null
          personality_traits: Json | null
          social_rank: string | null
          spawn_keywords: string[] | null
          world_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          personality_traits?: Json | null
          social_rank?: string | null
          spawn_keywords?: string[] | null
          world_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          personality_traits?: Json | null
          social_rank?: string | null
          spawn_keywords?: string[] | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_characters_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory_store: {
        Row: {
          ai_character_id: string | null
          created_at: string
          id: string
          last_interaction: string | null
          memory_notes: Json | null
          relationship_type: string
          trust_level: number | null
          updated_at: string
          user_character_id: string | null
          world_id: string
        }
        Insert: {
          ai_character_id?: string | null
          created_at?: string
          id?: string
          last_interaction?: string | null
          memory_notes?: Json | null
          relationship_type?: string
          trust_level?: number | null
          updated_at?: string
          user_character_id?: string | null
          world_id: string
        }
        Update: {
          ai_character_id?: string | null
          created_at?: string
          id?: string
          last_interaction?: string | null
          memory_notes?: Json | null
          relationship_type?: string
          trust_level?: number | null
          updated_at?: string
          user_character_id?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_store_ai_character_id_fkey"
            columns: ["ai_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_store_user_character_id_fkey"
            columns: ["user_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_store_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_room_id: string | null
          target_user_id: string | null
          world_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_room_id?: string | null
          target_user_id?: string | null
          world_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_room_id?: string | null
          target_user_id?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_room_id_fkey"
            columns: ["target_room_id"]
            isOneToOne: false
            referencedRelation: "world_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      character_gallery: {
        Row: {
          caption: string | null
          character_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          character_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          character_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "character_gallery_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_relationships: {
        Row: {
          character_id: string
          created_at: string
          id: string
          partner_character_id: string
          relationship_type: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          partner_character_id: string
          relationship_type?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          partner_character_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_relationships_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_relationships_partner_character_id_fkey"
            columns: ["partner_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          dislikes: string[] | null
          gender: string | null
          id: string
          identity_tags: Json | null
          is_hidden: boolean
          is_private: boolean
          likes: string[] | null
          name: string
          owner_id: string
          pronouns: string | null
          species: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          dislikes?: string[] | null
          gender?: string | null
          id?: string
          identity_tags?: Json | null
          is_hidden?: boolean
          is_private?: boolean
          likes?: string[] | null
          name: string
          owner_id: string
          pronouns?: string | null
          species?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          dislikes?: string[] | null
          gender?: string | null
          id?: string
          identity_tags?: Json | null
          is_hidden?: boolean
          is_private?: boolean
          likes?: string[] | null
          name?: string
          owner_id?: string
          pronouns?: string | null
          species?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          friendship_id: string
          id: string
          is_read: boolean
          sender_character_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          friendship_id: string
          id?: string
          is_read?: boolean
          sender_character_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          friendship_id?: string
          id?: string
          is_read?: boolean
          sender_character_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_character_id_fkey"
            columns: ["sender_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_character_id: string | null
          requester_id: string
          starter_message: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_character_id?: string | null
          requester_id: string
          starter_message: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_character_id?: string | null
          requester_id?: string
          starter_message?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_character_id_fkey"
            columns: ["requester_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          character_id: string | null
          content: string
          created_at: string
          emoji_reactions: Json | null
          id: string
          is_ai: boolean | null
          room_id: string
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
          updated_at: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          character_id?: string | null
          content: string
          created_at?: string
          emoji_reactions?: Json | null
          id?: string
          is_ai?: boolean | null
          room_id: string
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          character_id?: string | null
          content?: string
          created_at?: string
          emoji_reactions?: Json | null
          id?: string
          is_ai?: boolean | null
          room_id?: string
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "world_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string | null
          reason: string | null
          target_user_id: string | null
          world_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason?: string | null
          target_user_id?: string | null
          world_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason?: string | null
          target_user_id?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_logs_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_logs_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_character_id: string | null
          bio: string | null
          created_at: string
          dob: string
          followers_count: number | null
          following_count: number | null
          id: string
          is_minor: boolean
          stories_count: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          active_character_id?: string | null
          bio?: string | null
          created_at?: string
          dob: string
          followers_count?: number | null
          following_count?: number | null
          id: string
          is_minor?: boolean
          stories_count?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          active_character_id?: string | null
          bio?: string | null
          created_at?: string
          dob?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_minor?: boolean
          stories_count?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_character_id_fkey"
            columns: ["active_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          author_id: string
          content: string
          cover_url: string | null
          created_at: string
          id: string
          is_nsfw: boolean
          is_published: boolean
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          content: string
          cover_url?: string | null
          created_at?: string
          id?: string
          is_nsfw?: boolean
          is_published?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          is_nsfw?: boolean
          is_published?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_messages: {
        Row: {
          created_at: string
          duration: string | null
          id: string
          message_type: string
          room_id: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          duration?: string | null
          id?: string
          message_type: string
          room_id: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          duration?: string | null
          id?: string
          message_type?: string
          room_id?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "world_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_ai_characters: {
        Row: {
          avatar_description: string | null
          bio: string | null
          created_at: string
          expires_at: string
          id: string
          is_saved: boolean | null
          name: string
          personality_traits: Json | null
          room_id: string | null
          saved_character_id: string | null
          social_rank: string | null
          world_id: string
        }
        Insert: {
          avatar_description?: string | null
          bio?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_saved?: boolean | null
          name: string
          personality_traits?: Json | null
          room_id?: string | null
          saved_character_id?: string | null
          social_rank?: string | null
          world_id: string
        }
        Update: {
          avatar_description?: string | null
          bio?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_saved?: boolean | null
          name?: string
          personality_traits?: Json | null
          room_id?: string | null
          saved_character_id?: string | null
          social_rank?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "temp_ai_characters_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "world_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_ai_characters_saved_character_id_fkey"
            columns: ["saved_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_ai_characters_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      timeouts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          issued_by: string | null
          reason: string | null
          user_id: string
          world_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          issued_by?: string | null
          reason?: string | null
          user_id: string
          world_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string | null
          reason?: string | null
          user_id?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeouts_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeouts_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_character_id: string | null
          reported_message_id: string | null
          reported_user_id: string | null
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_character_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_character_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_character_id_fkey"
            columns: ["reported_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_message_id_fkey"
            columns: ["reported_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      world_events: {
        Row: {
          content: string
          created_at: string
          event_type: string
          id: string
          room_id: string | null
          triggered_by: string | null
          world_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_type: string
          id?: string
          room_id?: string | null
          triggered_by?: string | null
          world_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_type?: string
          id?: string
          room_id?: string | null
          triggered_by?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "world_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_events_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_events_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      world_members: {
        Row: {
          active_character_id: string | null
          id: string
          is_banned: boolean
          joined_at: string
          role: string
          timeout_until: string | null
          user_id: string
          world_id: string
        }
        Insert: {
          active_character_id?: string | null
          id?: string
          is_banned?: boolean
          joined_at?: string
          role?: string
          timeout_until?: string | null
          user_id: string
          world_id: string
        }
        Update: {
          active_character_id?: string | null
          id?: string
          is_banned?: boolean
          joined_at?: string
          role?: string
          timeout_until?: string | null
          user_id?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_members_active_character_id_fkey"
            columns: ["active_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_members_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      world_rooms: {
        Row: {
          background_url: string | null
          created_at: string
          description: string | null
          id: string
          is_staff_only: boolean
          name: string
          sort_order: number
          updated_at: string
          world_id: string
        }
        Insert: {
          background_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_staff_only?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          world_id: string
        }
        Update: {
          background_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_staff_only?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_rooms_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      worlds: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_nsfw: boolean
          is_public: boolean
          lore_content: string | null
          lore_image_url: string | null
          name: string
          owner_id: string
          rules: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_nsfw?: boolean
          is_public?: boolean
          lore_content?: string | null
          lore_image_url?: string | null
          name: string
          owner_id: string
          rules?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_nsfw?: boolean
          is_public?: boolean
          lore_content?: string | null
          lore_image_url?: string | null
          name?: string
          owner_id?: string
          rules?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worlds_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_ai_rate_limit: { Args: { _world_id: string }; Returns: boolean }
      clean_expired_timeouts: { Args: never; Returns: undefined }
      get_world_role: {
        Args: { _user_id: string; _world_id: string }
        Returns: string
      }
      is_blocked: { Args: { user_a: string; user_b: string }; Returns: boolean }
      is_user_timed_out: {
        Args: { _user_id: string; _world_id: string }
        Returns: boolean
      }
      is_world_member: {
        Args: { _user_id: string; _world_id: string }
        Returns: boolean
      }
      is_world_staff: {
        Args: { _user_id: string; _world_id: string }
        Returns: boolean
      }
    }
    Enums: {
      message_type: "dialogue" | "thought" | "narrator"
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
      message_type: ["dialogue", "thought", "narrator"],
    },
  },
} as const
