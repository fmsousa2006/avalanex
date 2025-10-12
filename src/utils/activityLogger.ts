import { supabase } from '../lib/supabase';

export type ActivityType =
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'password_reset_requested'
  | 'password_changed'
  | 'portfolio_created'
  | 'portfolio_updated'
  | 'portfolio_deleted'
  | 'stock_added'
  | 'stock_updated'
  | 'stock_removed'
  | 'transaction_added'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'dividend_recorded'
  | 'subscription_changed'
  | 'account_suspended'
  | 'account_activated'
  | 'subscription_cancelled'
  | 'admin_note_added'
  | 'forced_logout'
  | 'data_exported'
  | 'settings_updated'
  | 'profile_updated';

interface ActivityDetails {
  [key: string]: any;
}

export const logActivity = async (
  actionType: ActivityType,
  actionDetails: ActivityDetails = {}
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('No user found for activity logging');
      return;
    }

    const ipAddress = await fetchUserIP();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        action_type: actionType,
        action_details: actionDetails,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

const fetchUserIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return null;
  }
};

export const logAdminAction = async (
  targetUserId: string,
  actionType: ActivityType,
  actionDetails: ActivityDetails = {}
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('No admin user found for activity logging');
      return;
    }

    const ipAddress = await fetchUserIP();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: targetUserId,
        action_type: actionType,
        action_details: {
          ...actionDetails,
          performed_by_admin: user.id,
          admin_email: user.email
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};
