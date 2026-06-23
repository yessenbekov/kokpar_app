import { supabase } from "./supabaseClient.js";

export async function fetchActiveListings() {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyListings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("seller_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createListing(itemType, itemId, slotKey, horseId, price) {
  const { data, error } = await supabase.rpc("create_listing", {
    p_item_type: itemType,
    p_item_id: itemId ?? null,
    p_slot_key: slotKey ?? null,
    p_horse_id: horseId ?? null,
    p_price: price
  });
  if (error) throw error;
  return data; // listing uuid
}

export async function purchaseListing(listingId) {
  const { data, error } = await supabase.rpc("purchase_listing", {
    p_listing_id: listingId
  });
  if (error) throw error;
  return data; // { item_type, item_id, slot_key, horse_type_id, horse_name, price }
}

export async function cancelListing(listingId) {
  const { error } = await supabase.rpc("cancel_listing", {
    p_listing_id: listingId
  });
  if (error) throw error;
}
