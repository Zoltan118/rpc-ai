import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';

const router = Router();

// Example protected route - requires authentication
router.get('/profile', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Fetch additional user profile from our users table
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    
    res.json({
      success: true,
      data: {
        auth_user: req.user,
        profile: profile || null
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Example route that updates user profile
router.put('/profile', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { full_name, avatar_url } = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: req.user!.email,
        full_name,
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      data,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

// Example route for user subscription info
router.get('/subscription', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const { data: profile, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_tier, total_credits, used_credits')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // Also fetch pricing configuration
    const { data: pricingTiers } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly_cents');
    
    res.json({
      success: true,
      data: {
        subscription: profile || {
          subscription_status: 'free',
          subscription_tier: 'free',
          total_credits: 0,
          used_credits: 0
        },
        available_tiers: pricingTiers || []
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription information'
    });
  }
});

export default router;